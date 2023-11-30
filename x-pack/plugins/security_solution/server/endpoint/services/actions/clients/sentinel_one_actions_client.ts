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
import { dump } from '../../../utils/dump';
import { ResponseActionsClientError } from './errors';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
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
} from '../../../../../common/endpoint/types';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
} from '../../../../../common/api/endpoint';
import type { ResponseActionsClientOptions } from '../../../lib/response_actions/base_response_actions_client';
import { ResponseActionsClientImpl } from '../../../lib/response_actions/base_response_actions_client';

const createNotSupportedError = () => {
  // Throw a 405 Method Not Allowed
  return new CustomHttpRequestError(`Action is not currently supported`, 405);
};

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
    // FIXME:PT type properly the options above
  ): Promise<ActionTypeExecutorResult<unknown>> {
    const { id: connectorId } = await this.getConnector();
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute> = {
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

    if (actionSendResponse.status === 'error') {
      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${actionSendResponse.message}. ${actionSendResponse.serviceMessage}`,
        500,
        actionSendResponse
      );
    }

    return actionSendResponse;
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    const sendResponse = await this.sendAction(SUB_ACTION.ISOLATE_AGENT, {
      uuid: options.endpoint_ids[0],
    });

    const actionRequestDoc = this.writeActionRequestToEndpointIndex({
      ...options,
      command: 'isolate',
    });

    throw createNotSupportedError();
  }

  async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    throw createNotSupportedError();
  }

  async killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw createNotSupportedError();
  }

  async suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    throw createNotSupportedError();
  }

  async runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    throw createNotSupportedError();
  }

  async getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    throw createNotSupportedError();
  }

  async execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    throw createNotSupportedError();
  }

  async upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    throw createNotSupportedError();
  }
}
