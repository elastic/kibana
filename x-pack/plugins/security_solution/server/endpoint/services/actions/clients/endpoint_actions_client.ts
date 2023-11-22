/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { updateCases } from '../create/update_cases';
import type { CreateActionPayload } from '../create/types';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ResponseActionsRequestBody,
} from '../../../../../common/api/endpoint';
import { BaseResponseActionsClient } from '../../../lib/response_actions/base_actions_provider';
import type {
  ActionDetails,
  HostMetadata,
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
  HostMetadataInterface,
  ImmutableObject,
} from '../../../../../common/endpoint/types';

export class EndpointActionsClient extends BaseResponseActionsClient {
  private async checkAgentIds(ids: string[]): Promise<{
    valid: string[];
    invalid: string[];
    allValid: boolean;
    hosts: HostMetadata[];
  }> {
    const foundEndpointHosts = await this.options.endpointContext.service
      .getEndpointMetadataService()
      .getMetadataForEndpoints(this.options.esClient, [...new Set(ids)]);
    const validIds = foundEndpointHosts.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

    const invalidIds = ids.filter((id) => !validIds.includes(id));

    return {
      valid: validIds,
      invalid: invalidIds,
      allValid: invalidIds.length === 0,
      hosts: foundEndpointHosts,
    };
  }

  private async handleResponseAction<
    TOptions extends ResponseActionsRequestBody = ResponseActionsRequestBody,
    TResponse extends ActionDetails = ActionDetails
  >(command: ResponseActionsApiCommandNames, options: TOptions): Promise<TResponse> {
    const agentIds = await this.checkAgentIds(options.endpoint_ids);

    if (!agentIds.allValid) {
      this.log.debug(
        `The following agent ids are not valid - will skip them: ${JSON.stringify(
          agentIds.invalid
        )}`
      );
    }

    const createPayload: CreateActionPayload = {
      ...options,
      command,
      user: { username: this.options.username },
    };

    const response = await this.options.endpointContext.service
      .getActionCreateService()
      .createAction(createPayload, agentIds.valid);

    await this.updateCases(createPayload, agentIds.hosts);

    return response as TResponse;
  }

  protected async updateCases(
    createActionPayload: CreateActionPayload,
    endpointData: Array<ImmutableObject<HostMetadataInterface>>
  ): Promise<void> {
    return updateCases({
      casesClient: this.options.casesClient,
      createActionPayload,
      endpointData,
    });
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    return this.handleResponseAction<IsolationRouteRequestBody, ActionDetails>('isolate', options);
  }

  async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    return this.handleResponseAction<IsolationRouteRequestBody, ActionDetails>(
      'unisolate',
      options
    );
  }

  async killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    return this.handleResponseAction<
      KillOrSuspendProcessRequestBody,
      ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
    >('kill-process', options);
  }

  async suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    return this.handleResponseAction<
      KillOrSuspendProcessRequestBody,
      ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
    >('suspend-process', options);
  }

  async runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    return this.handleResponseAction<
      GetProcessesRequestBody,
      ActionDetails<GetProcessesActionOutputContent>
    >('running-processes', options);
  }

  async getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    return this.handleResponseAction<
      ResponseActionGetFileRequestBody,
      ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>
    >('get-file', options);
  }

  async execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    return this.handleResponseAction<
      ExecuteActionRequestBody,
      ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
    >('execute', options);
  }

  async upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    // FIXME:PT update is different due to use of a File buffer
    return this.handleResponseAction('upload', options);
  }
}
