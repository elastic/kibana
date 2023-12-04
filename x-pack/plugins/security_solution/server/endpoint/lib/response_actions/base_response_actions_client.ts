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
import { APP_ID } from '../../../../common';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { getActionDetailsById } from '../../services';
import { ResponseActionsClientError } from '../../services/actions/clients/errors';
import {
  addRuleInfoToAction,
  getActionParameters,
  getActionRequestExpiration,
} from '../../services/actions/create/write_action_to_indices';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';
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
} from '../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ResponseActionsRequestBody,
} from '../../../../common/api/endpoint';
import type { CreateActionPayload } from '../../services/actions/create/types';
import { dump } from '../../utils/dump';

export interface ResponseActionsClientOptions {
  endpointContext: EndpointAppContext;
  esClient: ElasticsearchClient;
  casesClient?: CasesClient;
  /** Username that will be stored along with the action's ES documents */
  username: string;
}

/**
 * Base class for a Response Actions client
 */
export abstract class ResponseActionsClientImpl implements ResponseActionsClient {
  protected readonly log: Logger;

  constructor(protected readonly options: ResponseActionsClientOptions) {
    this.log = options.endpointContext.logFactory.get(
      this.constructor.name ?? 'ResponseActionsClient'
    );
  }

  /**
   * Update cases with information about the hosts that received a response action.
   *
   * **NOTE:** Failures during update will not cause this operation to fail - it will only log the errors
   *
   * @param caseIds
   * @param alertIds
   * @param updates
   * @protected
   */
  protected async updateCases({
    command,
    hosts,
    caseIds = [],
    alertIds = [],
    comment = '',
  }: {
    /** The Response Action that was taken */
    command: ResponseActionsApiCommandNames;
    /** the list of hosts that received the response action `command` */
    hosts: Array<{
      hostname: string;
      endpointId: string;
    }>;
    caseIds?: string[];
    /** If defined, any case that the alert is included in will also receive an update */
    alertIds?: string[];
    /** Comment to include in the Case attachment */
    comment?: string;
  }): Promise<void> {
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
      return;
    }

    this.log.debug(`Updating cases:\n${dump(allCases)}`);

    // Create an attachment for each case that includes info. about the response actions taken against the hosts
    const attachments = allCases.map(() => ({
      type: AttachmentType.actions,
      comment,
      actions: {
        targets: hosts,
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
              `Attempt to update case ID [${caseId}] failed: ${err.message}\n${dump(err)}`
            );
            return null;
          })
      )
    );

    this.log.debug(`Update to cases done:\n${dump(casesUpdateResponse)}`);
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
      this.options.endpointContext.service.getEndpointMetadataService(),
      actionId
    );
  }

  /**
   * Creates a Response Action request document in the Endpoint index (`.logs-endpoint.actions-default`)
   * @protected
   */
  protected async writeActionRequestToEndpointIndex(
    actionRequest: ResponseActionsRequestBody &
      Pick<CreateActionPayload, 'command' | 'hosts' | 'rule_id' | 'rule_name'>
  ): Promise<LogsEndpointAction> {
    const doc: LogsEndpointAction = {
      '@timestamp': new Date().toISOString(),
      agent: {
        id: actionRequest.endpoint_ids,
      },
      EndpointActions: {
        action_id: uuidv4(),
        expiration: getActionRequestExpiration(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
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
          `Failed to create action request document. Received: [${logsEndpointActionsResult.statusCode}][${logsEndpointActionsResult.body.result}]`,
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

  public abstract isolate(options: IsolationRouteRequestBody): Promise<ActionDetails>;

  public abstract release(options: IsolationRouteRequestBody): Promise<ActionDetails>;

  public abstract killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  public abstract suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  public abstract runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>>;

  public abstract getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  public abstract execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  public abstract upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;
}
