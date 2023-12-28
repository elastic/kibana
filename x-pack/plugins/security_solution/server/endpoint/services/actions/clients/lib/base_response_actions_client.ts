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
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { BulkCreateArgs } from '@kbn/cases-plugin/server/client/attachments/types';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import { APP_ID } from '../../../../../../common';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
import {
  addRuleInfoToAction,
  getActionParameters,
  getActionRequestExpiration,
} from '../../create/write_action_to_indices';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import type { ResponseActionsClient } from './types';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
  KillOrSuspendProcessRequestBody,
  KillProcessActionOutputContent,
  ResponseActionExecuteOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithPidOrEntityId,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  SuspendProcessActionOutputContent,
  LogsEndpointAction,
  EndpointActionDataParameterTypes,
  LogsEndpointActionResponse,
  EndpointActionResponseDataOutput,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ResponseActionsRequestBody,
} from '../../../../../../common/api/endpoint';
import type { CreateActionPayload } from '../../create/types';
import { stringify } from '../../../../utils/stringify';

export interface ResponseActionsClientOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  casesClient?: CasesClient;
  /** Username that will be stored along with the action's ES documents */
  username: string;
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
}

export type ResponseActionsClientWriteActionRequestToEndpointIndexOptions =
  ResponseActionsRequestBody &
    Pick<CreateActionPayload, 'command' | 'hosts' | 'rule_id' | 'rule_name'>;

export type ResponseActionsClientWriteActionResponseToEndpointIndexOptions<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput
> = {
  agentId: LogsEndpointActionResponse['agent']['id'];
  actionId: string;
} & Pick<LogsEndpointActionResponse, 'error'> &
  Pick<LogsEndpointActionResponse<TOutputContent>['EndpointActions'], 'data'>;

/**
 * Base class for a Response Actions client
 */
export abstract class ResponseActionsClientImpl implements ResponseActionsClient {
  protected readonly log: Logger;

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
  }: ResponseActionsClientUpdateCasesOptions): Promise<void> {
    if (caseIds.length === 0 && alertIds.length === 0) {
      this.log.debug(`Nothing to do. 'caseIds' and 'alertIds' are empty`);
      return;
    }

    if (hosts.length === 0) {
      this.log.debug(`Nothing to do. 'hosts' is empty`);
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
      this.log.debug(`Nothing to do. Alert IDs are not tied to Cases`);
      return;
    }

    this.log.debug(`Updating cases:\n${stringify(allCases)}`);

    // Create an attachment for each case that includes info. about the response actions taken against the hosts
    const attachments = allCases.map(() => ({
      type: AttachmentType.actions,
      comment,
      actions: {
        targets: hosts.map(({ hostId: endpointId, hostname }) => ({ endpointId, hostname })),
        type: command,
      },
      owner: APP_ID,
    })) as BulkCreateArgs['attachments'];

    const casesUpdateResponse = await Promise.all(
      allCases.map((caseId) =>
        casesClient.attachments
          .bulkCreate({
            caseId,
            attachments,
          })
          .catch((err) => {
            // Log any error, BUT: do not fail execution
            this.log.warn(
              `Attempt to update case ID [${caseId}] failed: ${err.message}\n${stringify(err)}`
            );
            return null;
          })
      )
    );

    this.log.debug(`Update to cases done:\n${stringify(casesUpdateResponse)}`);
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
   * Creates a Response Action request document in the Endpoint index (`.logs-endpoint.actions-default`)
   * @protected
   */
  protected async writeActionRequestToEndpointIndex(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<LogsEndpointAction> {
    this.notifyUsage(actionRequest.command);

    const doc: LogsEndpointAction = {
      '@timestamp': new Date().toISOString(),
      agent: {
        id: actionRequest.endpoint_ids,
      },
      EndpointActions: {
        action_id: uuidv4(),
        expiration: getActionRequestExpiration(),
        type: 'INPUT_ACTION',
        input_type: this.agentType,
        data: {
          command: actionRequest.command,
          comment: actionRequest.comment ?? undefined,
          ...(actionRequest.alert_ids ? { alert_id: actionRequest.alert_ids } : {}),
          ...(actionRequest.hosts ? { hosts: actionRequest.hosts } : {}),
          parameters: getActionParameters(actionRequest) as EndpointActionDataParameterTypes,
        },
      },
      user: {
        id: this.options.username,
      },
      ...addRuleInfoToAction(actionRequest),
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

  /**
   * Writes a Response Action response document to the Endpoint index
   * @param options
   * @protected
   */
  protected async writeActionResponseToEndpointIndex<
    // Default type purposely set to empty object in order to ensure proper types are used when calling the method
    TOutputContent extends EndpointActionResponseDataOutput = Record<string, never>
  >({
    actionId,
    error,
    agentId,
    data,
  }: ResponseActionsClientWriteActionResponseToEndpointIndexOptions<TOutputContent>): Promise<
    LogsEndpointActionResponse<TOutputContent>
  > {
    const timestamp = new Date().toISOString();
    const doc: LogsEndpointActionResponse<TOutputContent> = {
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
    };

    this.log.debug(`Writing response action response:\n${stringify(doc)}`);

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

  public async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw new ResponseActionsNotSupportedError('isolate');
  }

  public async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw new ResponseActionsNotSupportedError('unisolate');
  }

  public async killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw new ResponseActionsNotSupportedError('kill-process');
  }

  public async suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw new ResponseActionsNotSupportedError('suspend-process');
  }

  public async runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    throw new ResponseActionsNotSupportedError('running-processes');
  }

  public async getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    throw new ResponseActionsNotSupportedError('get-file');
  }

  public async execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    throw new ResponseActionsNotSupportedError('execute');
  }

  public async upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    throw new ResponseActionsNotSupportedError('upload');
  }
}
