/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { SENTINELONE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
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
  // @ts-expect-error temporary until we can use the property
  private connector: Promise<ConnectorWithExtraFindData>;

  constructor({
    connectorActions,
    ...options
  }: ResponseActionsClientOptions & { connectorActions: ActionsClient }) {
    super(options);
    this.connectorActionsClient = connectorActions;
    this.connector = this.setup();
  }

  private async setup(): Promise<ConnectorWithExtraFindData> {
    const connector = (await this.connectorActionsClient.getAll()).find(
      ({ actionTypeId, isDeprecated, isMissingSecrets }) => {
        return actionTypeId === SENTINELONE_CONNECTOR_ID && !isDeprecated && !isMissingSecrets;
      }
    );

    if (!connector) {
      throw new ResponseActionsClientError(`No SentinelOne connector found`, 400);
    }

    this.log.debug(`Using SentinelOne connector: ${connector.name} (${connector.id})`);

    // TODO:PT can we check authz on API key for this connector? and error is it is not sufficient? Or maybe that should be done for each response actions?

    return connector;
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
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
