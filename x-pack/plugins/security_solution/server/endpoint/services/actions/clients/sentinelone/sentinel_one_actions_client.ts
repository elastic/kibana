/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { NormalizedExternalConnectorClientExecuteOptions } from '../lib/normalized_external_connector_client';
import { NormalizedExternalConnectorClient } from '../lib/normalized_external_connector_client';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  KillOrSuspendProcessRequestBody,
  KillProcessActionOutputContent,
  LogsEndpointAction,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithPidOrEntityId,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
} from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientValidateRequestResponse,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';

export type SentinelOneActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: ActionsClient | IUnsecuredActionsClient;
};

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: SentinelOneActionsClientOptions) {
    super(options);
    this.connectorActionsClient = new NormalizedExternalConnectorClient(
      SENTINELONE_CONNECTOR_ID,
      connectorActions,
      this.log
    );
  }

  protected async writeActionRequestToEndpointIndex(
    actionRequest: Omit<ResponseActionsClientWriteActionRequestToEndpointIndexOptions, 'hosts'>
  ): Promise<LogsEndpointAction> {
    const agentId = actionRequest.endpoint_ids[0];
    const agentDetails = await this.getAgentDetails(agentId);

    return super.writeActionRequestToEndpointIndex({
      ...actionRequest,
      hosts: {
        [agentId]: { name: agentDetails.computerName },
      },
    });
  }

  /**
   * Sends actions to SentinelOne directly (via Connector)
   * @private
   */
  private async sendAction(
    actionType: SUB_ACTION,
    actionParams: object
  ): Promise<ActionTypeExecutorResult<unknown>> {
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      `calling connector actions 'execute()' for SentinelOne with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(`Response:\n${stringify(actionSendResponse)}`);

    return actionSendResponse;
  }

  /** Gets agent details directly from SentinelOne */
  private async getAgentDetails(id: string): Promise<SentinelOneGetAgentsResponse['data'][number]> {
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions<
      SentinelOneGetAgentsParams,
      SUB_ACTION
    > = {
      params: {
        subAction: SUB_ACTION.GET_AGENTS,
        subActionParams: {
          uuid: id,
        },
      },
    };

    const s1ApiResponse: SentinelOneGetAgentsResponse | undefined = (
      (await this.connectorActionsClient.execute(
        executeOptions
      )) as ActionTypeExecutorResult<SentinelOneGetAgentsResponse>
    ).data;

    this.log.debug(
      `Response for SentinelOne agent id [${id}] returned:\n${stringify(s1ApiResponse)}`
    );

    if (!s1ApiResponse || !s1ApiResponse.data[0]) {
      throw new ResponseActionsClientError(`SentinelOne agent id [${id}] not found`, 404);
    }

    return s1ApiResponse.data[0];
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO:PT support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
          400
        ),
      };
    }

    return super.validateRequest(payload);
  }

  async isolate(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'isolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.ISOLATE_HOST, { uuid: actionRequest.endpoint_ids[0] });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    if (!actionRequestDoc.error) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });
    }

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async release(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.RELEASE_HOST, { uuid: actionRequest.endpoint_ids[0] });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    if (!actionRequestDoc.error) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });
    }

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async killProcess(
    actionRequest: KillOrSuspendProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  > {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'kill-process',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.KILL_PROCESS, {
            uuid: actionRequest.endpoint_ids[0],
            processName: actionRequest.parameters.process_name,
          });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async getFile(
    actionRequest: ResponseActionGetFileRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'get-file',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.GET_AGENT_FILES, {
            agentUUID: actionRequest.endpoint_ids[0],
            zipPassCode: 'Elastic@123',
            files: [actionRequest.parameters.path],
          });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  public async attemptToComplete(actionDetails: ActionDetails) {
    if (actionDetails.command === 'get-file') {
      const s1Agent = await this.getAgentDetails(actionDetails.agents[0]);

      // 1. query the Activity log in S1 looking for the response to a file retrieval for our agent
      const results = await this.sendAction(SUB_ACTION.GET_ACTIVITIES, {
        activityTypes: 80,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        createdAt__gt: actionDetails.startedAt,
        agentIds: s1Agent.id,
        limit: 1, // POC code... this will not work in prod.
      });

      this.log.debug(stringify(results.data));

      // FYI:
      //   request for the file is `activityType=81`
      //   Both request and response seem to share the same `data.commandBatchUuid` - maybe this is a way to sync these up to get the correct one

      if (results.data.data.length) {
        // Activity was completed and we got a response. Store a response doc for it
      }
    }

    return actionDetails;
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    // TODO:PT implement resolving of pending S1 actions
    // if (abortSignal.aborted) {
    //   return;
    // }
    // Dev test entry below
    // await this.getAgentDetails('123').catch(() => {});
  }
}
