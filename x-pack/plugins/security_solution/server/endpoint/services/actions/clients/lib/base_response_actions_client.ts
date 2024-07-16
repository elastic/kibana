/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { Logger } from '@kbn/logging';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentType, ExternalReferenceStorageType } from '@kbn/cases-plugin/common';
import type { CaseAttachments } from '@kbn/cases-plugin/public/types';
import { i18n } from '@kbn/i18n';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SimpleMemCache } from './simple_mem_cache';
import { validateActionId } from '../../utils/validate_action_id';
import {
  fetchActionResponses,
  fetchEndpointActionResponses,
} from '../../utils/fetch_action_responses';
import { createEsSearchIterable } from '../../../../utils/create_es_search_iterable';
import {
  getActionCompletionInfo,
  getActionRequestExpiration,
  mapResponsesByActionId,
  mapToNormalizedActionRequest,
} from '../../utils';
import { isActionSupportedByAgentType } from '../../../../../../common/endpoint/service/response_actions/is_response_action_supported';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import { APP_ID } from '../../../../../../common';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import type {
  CommonResponseActionMethodOptions,
  GetFileDownloadMethodResponse,
  ProcessPendingActionsMethodOptions,
  ResponseActionsClient,
} from './types';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  GetProcessesActionOutputContent,
  KillProcessActionOutputContent,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionExecuteOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithProcessData,
  ResponseActionScanOutputContent,
  ResponseActionsExecuteParameters,
  ResponseActionScanParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  SuspendProcessActionOutputContent,
  UploadedFileInfo,
  WithAllKeys,
  KillProcessRequestBody,
  SuspendProcessRequestBody,
} from '../../../../../../common/endpoint/types';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  ResponseActionsRequestBody,
  ScanActionRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../../common/api/endpoint';
import { stringify } from '../../../../utils/stringify';
import { CASE_ATTACHMENT_ENDPOINT_TYPE_ID } from '../../../../../../common/constants';
import { EMPTY_COMMENT } from '../../../../utils/translations';

const ELASTIC_RESPONSE_ACTION_MESSAGE = (
  username: string = 'system',
  command: ResponseActionsApiCommandNames,
  responseActionId: string
): string => {
  return i18n.translate('xpack.securitySolution.responseActions.comment.message', {
    values: { username, command, responseActionId },
    defaultMessage: `Action triggered from Elastic Security by user [{username}] for action [{command} (action id: {responseActionId})]`,
  });
};

const ENTERPRISE_LICENSE_REQUIRED_MSG = i18n.translate(
  'xpack.securitySolution.responseActionsList.error.licenseTooLow',
  {
    defaultMessage: 'At least Enterprise license is required to use Response Actions.',
  }
);

export const HOST_NOT_ENROLLED = i18n.translate(
  'xpack.securitySolution.responseActionsList.error.hostNotEnrolled',
  {
    defaultMessage: 'The host does not have Elastic Defend integration installed',
  }
);

export interface ResponseActionsClientOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  casesClient?: CasesClient;
  /** Username that will be stored along with the action's ES documents */
  username: string;
  /**
   * Is the instance of the client being used for automated response actions.
   * When set to `true`, additional checks will be performed and the Endpoint response action
   * request will (almost) always be created, even if there certain errors occur along the way
   */
  isAutomated?: boolean;
}

export interface ResponseActionsClientUpdateCasesOptions {
  /** The Response Action that was taken */
  command: ResponseActionsApiCommandNames;
  /** the list of hosts that received the response action `command` */
  hosts: Array<{
    hostname: string;
    hostId: string;
  }>;
  caseIds?: string[];
  /** If defined, any case that the alert is included in will also receive an update */
  alertIds?: string[];
  /** Comment to include in the Case attachment */
  comment?: string;
  /** The id of the action that was taken */
  actionId: string;
}

export type ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
> = ResponseActionsRequestBody &
  Pick<CommonResponseActionMethodOptions, 'ruleName' | 'ruleId' | 'hosts' | 'error'> &
  Pick<LogsEndpointAction<TParameters, TOutputContent, TMeta>, 'meta'> & {
    command: ResponseActionsApiCommandNames;
    actionId?: string;
  };

export type ResponseActionsClientWriteActionResponseToEndpointIndexOptions<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
> = {
  agentId: LogsEndpointActionResponse['agent']['id'];
  actionId: string;
} & Pick<LogsEndpointActionResponse<TOutputContent, TMeta>, 'error' | 'meta'> &
  Pick<LogsEndpointActionResponse<TOutputContent>['EndpointActions'], 'data'>;

export type ResponseActionsClientValidateRequestResponse =
  | {
      isValid: true;
      error: undefined;
    }
  | {
      isValid: false;
      error: ResponseActionsClientError;
    };

export interface FetchActionResponseEsDocsResponse<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
> {
  [agentId: string]: LogsEndpointActionResponse<TOutputContent, TMeta>;
}

export interface ResponseActionsClientPendingAction<
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
> {
  action: LogsEndpointAction<TParameters, TOutputContent, TMeta>;
  pendingAgentIds: string[];
}

/**
 * Base class for a Response Actions client
 */
export abstract class ResponseActionsClientImpl implements ResponseActionsClient {
  protected readonly log: Logger;

  protected readonly cache = new SimpleMemCache();

  protected abstract readonly agentType: ResponseActionAgentType;

  constructor(protected readonly options: ResponseActionsClientOptions) {
    this.log = options.endpointService.createLogger(
      this.constructor.name ?? 'ResponseActionsClient'
    );
  }

  /**
   * Update cases with information about the hosts that received a response action.
   *
   * **NOTE:** Failures during update will not cause this operation to fail - it will only log the errors
   * @protected
   */
  protected async updateCases({
    command,
    hosts,
    caseIds = [],
    alertIds = [],
    comment = '',
    actionId,
  }: ResponseActionsClientUpdateCasesOptions): Promise<void> {
    if (caseIds.length === 0 && alertIds.length === 0) {
      this.log.debug(`No updates to Cases needed. 'caseIds' and 'alertIds' are empty`);
      return;
    }

    if (hosts.length === 0) {
      this.log.debug(`No updates to Cases needed. 'hosts' is empty`);
      return;
    }

    const casesClient = this.options.casesClient;

    if (!casesClient) {
      this.log.debug(`No CasesClient available. Skipping updates to Cases!`);
      return;
    }

    const casesFromAlertIds = await Promise.all(
      alertIds.map((alertID) => {
        return casesClient.cases
          .getCasesByAlertID({ alertID, options: { owner: APP_ID } })
          .then((casesFound) => {
            return casesFound.map((caseInfo) => caseInfo.id);
          })
          .catch((err) => {
            this.log.warn(
              `Attempt to get cases for alertID [${alertID}][owner: ${APP_ID}] failed with: ${err.message}`
            );

            // We don't fail everything here. Just log it and keep going
            return [] as string[];
          });
      })
    ).then((results) => {
      return results.flat();
    });

    const allCases = [...new Set([...caseIds, ...casesFromAlertIds])];

    if (allCases.length === 0) {
      this.log.debug(`No updates to Cases needed. Alert IDs are not tied to Cases`);
      return;
    }

    this.log.debug(() => `Updating cases:\n${stringify(allCases)}`);

    const attachments: CaseAttachments = [
      {
        type: AttachmentType.externalReference,
        externalReferenceId: actionId,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc,
        },
        externalReferenceAttachmentTypeId: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
        externalReferenceMetadata: {
          targets: hosts.map(({ hostId: endpointId, hostname }) => {
            return {
              endpointId,
              hostname,
              agentType: this.agentType,
            };
          }),
          command,
          comment: comment || EMPTY_COMMENT,
        },
        owner: APP_ID,
      },
    ];

    const casesUpdateResponse = await Promise.all(
      allCases.map(async (caseId) => {
        try {
          return await casesClient.attachments.bulkCreate({
            caseId,
            attachments,
          });
        } catch (err) {
          this.log.warn(
            `Attempt to update case ID [${caseId}] failed: ${err.message}\n${stringify(err)}`
          );
          return null;
        }
      })
    );

    this.log.debug(() => `Update to cases done:\n${stringify(casesUpdateResponse)}`);
  }

  protected getMethodOptions<
    T extends CommonResponseActionMethodOptions = CommonResponseActionMethodOptions
  >(options: Partial<T> = {}): WithAllKeys<CommonResponseActionMethodOptions> {
    return {
      hosts: undefined,
      ruleId: undefined,
      ruleName: undefined,
      error: undefined,
      ...options,
    };
  }

  /**
   * Returns the action details for a given response action id
   * @param actionId
   * @protected
   */
  protected async fetchActionDetails<T extends ActionDetails = ActionDetails>(
    actionId: string
  ): Promise<T> {
    return getActionDetailsById(
      this.options.esClient,
      this.options.endpointService.getEndpointMetadataService(),
      actionId
    );
  }

  /**
   * Fetches the Response Action ES response documents for a given action id
   * @param actionId
   * @param agentIds
   * @protected
   */
  protected async fetchActionResponseEsDocs<
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionId: string,
    /** Specific Agent IDs to retrieve. default is to retrieve all */
    agentIds?: string[]
  ): Promise<FetchActionResponseEsDocsResponse<TOutputContent, TMeta>> {
    const responseDocs = await fetchEndpointActionResponses<TOutputContent, TMeta>({
      esClient: this.options.esClient,
      actionIds: [actionId],
      agentIds,
    });

    return responseDocs.reduce<FetchActionResponseEsDocsResponse<TOutputContent, TMeta>>(
      (acc, response) => {
        const agentId = Array.isArray(response.agent.id) ? response.agent.id[0] : response.agent.id;

        acc[agentId] = response;

        return acc;
      },
      {}
    );
  }

  /**
   * Provides validations against a response action request and returns the result.
   * Checks made should be generic to all response actions and not specific to any one action.
   *
   * @param actionRequest
   * @protected
   */
  protected async validateRequest(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // Validation for Automated Response actions
    if (this.options.isAutomated) {
      // Automated response actions is an Enterprise level feature
      if (!this.options.endpointService.getLicenseService().isEnterprise()) {
        return {
          isValid: false,
          error: new ResponseActionsClientError(ENTERPRISE_LICENSE_REQUIRED_MSG, 403),
        };
      }
    }

    if (actionRequest.endpoint_ids.length === 0) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(HOST_NOT_ENROLLED, 400),
      };
    }

    if (
      !isActionSupportedByAgentType(
        this.agentType,
        actionRequest.command,
        this.options.isAutomated ? 'automated' : 'manual'
      )
    ) {
      return {
        isValid: false,
        error: new ResponseActionsNotSupportedError(actionRequest.command),
      };
    }

    return { isValid: true, error: undefined };
  }

  /**
   * Creates a Response Action request document in the Endpoint index (`.logs-endpoint.actions-default`)
   * @protected
   */
  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      TMeta
    >
  ): Promise<LogsEndpointAction<TParameters, TOutputContent, TMeta>> {
    let errorMsg = String(actionRequest.error ?? '').trim();

    if (!errorMsg) {
      const validation = await this.validateRequest(actionRequest);

      if (!validation.isValid) {
        if (this.options.isAutomated) {
          errorMsg = validation.error.message;
        } else {
          throw validation.error;
        }
      }
    }

    this.notifyUsage(actionRequest.command);

    const doc: LogsEndpointAction<TParameters, TOutputContent, TMeta> = {
      '@timestamp': new Date().toISOString(),
      agent: {
        id: actionRequest.endpoint_ids,
      },
      EndpointActions: {
        action_id: actionRequest.actionId || uuidv4(),
        expiration: getActionRequestExpiration(),
        type: 'INPUT_ACTION',
        input_type: this.agentType,
        data: {
          command: actionRequest.command,
          comment: actionRequest.comment ?? undefined,
          ...(actionRequest.alert_ids ? { alert_id: actionRequest.alert_ids } : {}),
          ...(actionRequest.hosts ? { hosts: actionRequest.hosts } : {}),
          parameters: actionRequest.parameters as EndpointActionDataParameterTypes,
        },
      },
      user: {
        id: this.options.username,
      },
      meta: actionRequest.meta,
      ...(errorMsg ? { error: { message: errorMsg } } : {}),
      ...(actionRequest.ruleId && actionRequest.ruleName
        ? { rule: { id: actionRequest.ruleId, name: actionRequest.ruleName } }
        : {}),
    };

    try {
      const logsEndpointActionsResult = await this.options.esClient.index<LogsEndpointAction>(
        {
          index: ENDPOINT_ACTIONS_INDEX,
          document: doc,
          refresh: 'wait_for',
        },
        { meta: true }
      );

      if (logsEndpointActionsResult.statusCode !== 201) {
        throw new ResponseActionsClientError(
          `Failed to create (index) action request document. StatusCode: [${logsEndpointActionsResult.statusCode}] Result: ${logsEndpointActionsResult.body.result}`,
          500,
          logsEndpointActionsResult
        );
      }

      return doc;
    } catch (err) {
      if (!(err instanceof ResponseActionsClientError)) {
        throw new ResponseActionsClientError(
          `Failed to create action request document: ${err.message}`,
          500,
          err
        );
      }

      throw err;
    }
  }

  protected buildActionResponseEsDoc<
    // Default type purposely set to empty object in order to ensure proper types are used when calling the method
    TOutputContent extends EndpointActionResponseDataOutput = Record<string, never>,
    TMeta extends {} = {}
  >({
    actionId,
    error,
    agentId,
    data,
    meta,
  }: ResponseActionsClientWriteActionResponseToEndpointIndexOptions<
    TOutputContent,
    TMeta
  >): LogsEndpointActionResponse<TOutputContent, TMeta> {
    const timestamp = new Date().toISOString();
    const doc: LogsEndpointActionResponse<TOutputContent, TMeta> = {
      '@timestamp': timestamp,
      agent: {
        id: agentId,
      },
      EndpointActions: {
        action_id: actionId,
        input_type: this.agentType,
        started_at: timestamp,
        completed_at: timestamp,
        data,
      },
      error,
      meta,
    };

    return doc;
  }

  /**
   * Writes a Response Action response document to the Endpoint index
   * @param options
   * @protected
   */
  protected async writeActionResponseToEndpointIndex<
    // Default type purposely set to empty object in order to ensure proper types are used when calling the method
    TOutputContent extends EndpointActionResponseDataOutput = Record<string, never>
  >(
    options: ResponseActionsClientWriteActionResponseToEndpointIndexOptions<TOutputContent>
  ): Promise<LogsEndpointActionResponse<TOutputContent>> {
    const doc = this.buildActionResponseEsDoc(options);

    this.log.debug(() => `Writing response action response:\n${stringify(doc)}`);

    await this.options.esClient
      .index<LogsEndpointActionResponse<TOutputContent>>({
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        document: doc,
        refresh: 'wait_for',
      })
      .catch((err) => {
        throw new ResponseActionsClientError(
          `Failed to create action response document: ${err.message}`,
          err.statusCode ?? 500,
          err
        );
      });

    return doc;
  }

  protected notifyUsage(responseAction: ResponseActionsApiCommandNames): void {
    const usageService = this.options.endpointService.getFeatureUsageService();
    const featureKey = usageService.getResponseActionFeatureKey(responseAction);

    if (!featureKey) {
      this.log.warn(
        `Response action [${responseAction}] does not have a usage feature key defined!`
      );
      return;
    }

    usageService.notifyUsage(featureKey);
  }

  /**
   * Builds a comment for use in response action requests sent to external EDR systems
   * @protected
   */
  protected buildExternalComment(
    actionRequestIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): string {
    const { actionId = uuidv4(), comment, command } = actionRequestIndexOptions;

    // If the action request index options does not yet have an actionId assigned to it, then do it now.
    // Need to ensure we have an action id for cross-reference.
    if (!actionRequestIndexOptions.actionId) {
      actionRequestIndexOptions.actionId = actionId;
    }

    return (
      ELASTIC_RESPONSE_ACTION_MESSAGE(this.options.username, command, actionId) +
      (comment ? `: ${comment}` : '')
    );
  }
  protected async ensureValidActionId(actionId: string): Promise<void> {
    return validateActionId(this.options.esClient, actionId, this.agentType);
  }

  protected fetchAllPendingActions(): AsyncIterable<ResponseActionsClientPendingAction[]> {
    const esClient = this.options.esClient;
    const query: QueryDslQueryContainer = {
      bool: {
        must: {
          // Only actions for this agent type
          term: { 'EndpointActions.input_type': this.agentType },
        },
        must_not: {
          // No action requests that have an `error` property defined
          exists: { field: 'error' },
        },
        filter: [
          // We only want actions requests whose expiration date is greater than now
          { range: { 'EndpointActions.expiration': { gte: 'now' } } },
        ],
      },
    };

    return createEsSearchIterable<LogsEndpointAction>({
      esClient,
      searchRequest: {
        index: ENDPOINT_ACTIONS_INDEX,
        sort: '@timestamp',
        query,
      },
      resultsMapper: async (data): Promise<ResponseActionsClientPendingAction[]> => {
        const actionRequests = data.hits.hits.map((hit) => hit._source as LogsEndpointAction);
        const pendingRequests: ResponseActionsClientPendingAction[] = [];

        if (actionRequests.length > 0) {
          const actionResults = await fetchActionResponses({
            esClient,
            actionIds: actionRequests.map((action) => action.EndpointActions.action_id),
          });
          const responsesByActionId = mapResponsesByActionId(actionResults);

          // Determine what actions are still pending
          for (const actionRequest of actionRequests) {
            const actionCompleteInfo = getActionCompletionInfo(
              mapToNormalizedActionRequest(actionRequest),
              responsesByActionId[actionRequest.EndpointActions.action_id] ?? {
                endpointResponses: [],
                fleetResponses: [],
              }
            );

            // If not completed, add action to the pending list and calculate the list of agent IDs
            // whose response we are still waiting on
            if (!actionCompleteInfo.isCompleted) {
              const pendingActionData: ResponseActionsClientPendingAction = {
                action: actionRequest,
                pendingAgentIds: [],
              };

              for (const [agentId, agentIdState] of Object.entries(actionCompleteInfo.agentState)) {
                if (!agentIdState.isCompleted) {
                  pendingActionData.pendingAgentIds.push(agentId);
                }
              }

              pendingRequests.push(pendingActionData);
            }
          }
        }

        return pendingRequests;
      },
    });
  }

  public async isolate(
    actionRequest: IsolationRouteRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails> {
    throw new ResponseActionsNotSupportedError('isolate');
  }

  public async release(
    actionRequest: IsolationRouteRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails> {
    throw new ResponseActionsNotSupportedError('unisolate');
  }

  public async killProcess(
    actionRequest: KillProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
  > {
    throw new ResponseActionsNotSupportedError('kill-process');
  }

  public async suspendProcess(
    actionRequest: SuspendProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithProcessData>
  > {
    throw new ResponseActionsNotSupportedError('suspend-process');
  }

  public async runningProcesses(
    actionRequest: GetProcessesRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    throw new ResponseActionsNotSupportedError('running-processes');
  }

  public async getFile(
    actionRequest: ResponseActionGetFileRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    throw new ResponseActionsNotSupportedError('get-file');
  }

  public async execute(
    actionRequest: ExecuteActionRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    throw new ResponseActionsNotSupportedError('execute');
  }

  public async upload(
    actionRequest: UploadActionApiRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    throw new ResponseActionsNotSupportedError('upload');
  }

  public async scan(
    actionRequest: ScanActionRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionScanOutputContent, ResponseActionScanParameters>> {
    throw new ResponseActionsNotSupportedError('scan');
  }

  public async processPendingActions(_: ProcessPendingActionsMethodOptions): Promise<void> {
    this.log.debug(`#processPendingActions() method is not implemented for ${this.agentType}!`);
  }

  public async getFileDownload(
    actionId: string,
    fileId: string
  ): Promise<GetFileDownloadMethodResponse> {
    throw new ResponseActionsClientError(`Method getFileDownload() not implemented`, 501);
  }

  public async getFileInfo(actionId: string, fileId: string): Promise<UploadedFileInfo> {
    throw new ResponseActionsClientError(`Method getFileInfo() not implemented`, 501);
  }
}
