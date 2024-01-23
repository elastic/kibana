/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from '../../../utils/stringify';
import type { HapiReadableStream } from '../../../../types';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionAgentType,
} from '../../../../../common/endpoint/service/response_actions/constants';
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
import { ResponseActionsClientImpl } from './lib/base_response_actions_client';
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
} from '../../../../../common/endpoint/types';

export class EndpointActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'endpoint';

  private async checkAgentIds(ids: string[]): Promise<{
    valid: string[];
    invalid: string[];
    allValid: boolean;
    hosts: HostMetadata[];
  }> {
    const foundEndpointHosts = await this.options.endpointService
      .getEndpointMetadataService()
      .getMetadataForEndpoints(this.options.esClient, [...new Set(ids)]);
    const validIds = foundEndpointHosts.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
    const invalidIds = ids.filter((id) => !validIds.includes(id));

    if (invalidIds.length) {
      this.log.debug(`The following agent ids are not valid: ${JSON.stringify(invalidIds)}`);
    }

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
    const createPayload: CreateActionPayload = {
      ...options,
      command,
      user: { username: this.options.username },
    };

    const response = await this.options.endpointService
      .getActionCreateService()
      .createAction(createPayload, agentIds.valid);

    try {
      await updateCases({
        casesClient: this.options.casesClient,
        endpointData: agentIds.hosts,
        createActionPayload: createPayload,
      });
    } catch (err) {
      // failures during update of cases should not cause the response action to fail. Just log error
      this.log.warn(`failed to update cases: ${err.message}\n${stringify(err)}`);
    }

    return response as TResponse;
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
    const fleetFiles = await this.options.endpointService.getFleetToHostFilesClient();
    const fileStream = options.file as HapiReadableStream;
    const { file: _, parameters: userParams, ...actionPayload } = options;
    const uploadParameters: ResponseActionUploadParameters = {
      ...userParams,
      file_id: '',
      file_name: '',
      file_sha256: '',
      file_size: 0,
    };

    const createdFile = await fleetFiles.create(fileStream, actionPayload.endpoint_ids);

    uploadParameters.file_id = createdFile.id;
    uploadParameters.file_name = createdFile.name;
    uploadParameters.file_sha256 = createdFile.sha256;
    uploadParameters.file_size = createdFile.size;

    const createFileActionOptions = {
      ...actionPayload,
      parameters: uploadParameters,
      command: 'upload' as ResponseActionsApiCommandNames,
    };

    try {
      const createdAction = await this.handleResponseAction<
        typeof createFileActionOptions,
        ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>
      >('upload', createFileActionOptions);

      // Update the file meta to include the action id, and if any errors (unlikely),
      // then just log them and still allow api to return success since the action has
      // already been created and potentially dispatched to Endpoint. Action ID is not
      // needed by the Endpoint or fleet-server's API, so no need to fail here
      try {
        await fleetFiles.update(uploadParameters.file_id, { actionId: createdAction.id });
      } catch (e) {
        this.log.warn(`Attempt to update File meta with Action ID failed: ${e.message}`, e);
      }

      return createdAction;
    } catch (err) {
      if (uploadParameters.file_id) {
        // Try to delete the created file since creating the action threw an error
        try {
          await fleetFiles.delete(uploadParameters.file_id);
        } catch (e) {
          this.log.error(
            `Attempt to clean up file id [${uploadParameters.file_id}] (after action creation was unsuccessful) failed; ${e.message}`,
            e
          );
        }
      }

      throw err;
    }
  }
}
