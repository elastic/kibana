/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { once } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { dump } from '../../../../utils/dump';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
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
} from '../../../../../../common/endpoint/types';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../../common/api/endpoint';
import type { ResponseActionsClientOptions } from '../../../../lib/response_actions/base_response_actions_client';
import { ResponseActionsClientImpl } from '../../../../lib/response_actions/base_response_actions_client';

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  private readonly connectorActionsClient: ActionsClient;
  private readonly getConnector: () => Promise<ConnectorWithExtraFindData>;

  constructor({
    connectorActions,
    ...options
  }: ResponseActionsClientOptions & { connectorActions: ActionsClient }) {
    super(options);
    this.connectorActionsClient = connectorActions;

    this.getConnector = once(async () => {
      let connectorList: ConnectorWithExtraFindData[] = [];

      try {
        connectorList = await this.connectorActionsClient.getAll();
      } catch (err) {
        throw new ResponseActionsClientError(
          `Unable to retrieve list of stack connectors: ${err.message}`,
          // failure here is likely due to Authz, but because we don't have a good way to determine that,
          // the `statusCode` below is set to `400` instead of `401`.
          400,
          err
        );
      }
      const connector = connectorList.find(({ actionTypeId, isDeprecated, isMissingSecrets }) => {
        return actionTypeId === SENTINELONE_CONNECTOR_ID && !isDeprecated && !isMissingSecrets;
      });

      if (!connector) {
        throw new ResponseActionsClientError(
          `No SentinelOne stack connector found`,
          400,
          connectorList
        );
      }

      this.log.debug(`Using SentinelOne stack connector: ${connector.name} (${connector.id})`);

      return connector;
    });
  }

  /**
   * Sends actions to SentinelOne directly
   * @private
   */
  private async sendAction(
    actionType: SUB_ACTION,
    actionParams: object
    // FIXME:PT type properly the options above once PR 168441 for 8.12 merges
  ): Promise<ActionTypeExecutorResult<unknown>> {
    const { id: connectorId } = await this.getConnector();
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      actionId: connectorId,
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      `calling connector actions 'execute()' for SentinelOne with:\b${dump(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    this.log.debug(`Response:\n${dump(actionSendResponse)}`);

    if (actionSendResponse.status === 'error') {
      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    return actionSendResponse;
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    const agentUUID = options.endpoint_ids[0];
    // TODO:PT will we support multiple agent IDs? and does S1 even support that? code above needs updating

    await this.sendAction(SUB_ACTION.ISOLATE_AGENT, {
      uuid: agentUUID,
    });

    // FIXME:PT need to grab data from the response above and store it with the Request or Response documents on our side

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex({
      ...options,
      command: 'isolate',
    });

    // FIXME:PT Write response for this action

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw new ResponseActionsNotSupportedError('unisolate');
  }

  async killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw new ResponseActionsNotSupportedError('kill-process');
  }

  async suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw new ResponseActionsNotSupportedError('suspend-process');
  }

  async runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    throw new ResponseActionsNotSupportedError('running-processes');
  }

  async getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    throw new ResponseActionsNotSupportedError('get-file');
  }

  async execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    throw new ResponseActionsNotSupportedError('execute');
  }

  async upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    throw new ResponseActionsNotSupportedError('upload');
  }
}
