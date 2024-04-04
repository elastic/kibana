/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentsParams,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError } from '../errors';
import type { ActionDetails, LogsEndpointAction } from '../../../../../../common/endpoint/types';
import type { IsolationRouteRequestBody } from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
  ResponseActionsClientValidateRequestResponse,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';
import type { NormalizedExternalConnectorClientExecuteOptions } from '../lib/normalized_external_connector_client';
import { NormalizedExternalConnectorClient } from '../lib/normalized_external_connector_client';

export type CrowdstrikeActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: ActionsClient | IUnsecuredActionsClient;
};

export class CrowdstrikeActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: CrowdstrikeActionsClientOptions) {
    super(options);
    this.connectorActionsClient = new NormalizedExternalConnectorClient(
      CROWDSTRIKE_CONNECTOR_ID,
      connectorActions,
      this.log
    );
  }

  protected async writeActionRequestToEndpointIndex(
    actionRequest: Omit<ResponseActionsClientWriteActionRequestToEndpointIndexOptions, 'hosts'>
  ): Promise<LogsEndpointAction> {
    const agentId = actionRequest.endpoint_ids[0];
    const eventDetails = await super.getEventDetailsById({
      index: ['logs-crowdstrike.fdr-default', 'logs-crowdstrike.falcon-default'],
      term: { 'crowdstrike.event.DeviceId': agentId },
    });

    return super.writeActionRequestToEndpointIndex({
      ...actionRequest,
      hosts: {
        [agentId]: { name: eventDetails['crowdstrike.event.HostName'] },
      },
    });
  }

  /**
   * Sends actions to Crowdstrike directly (via Connector)
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
      `calling connector actions 'execute()' for Crowdstrike with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      // TODO TC: check if we want to handle different errors like 401
      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to Crowdstrike failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(`Response:\n${stringify(actionSendResponse)}`);

    return actionSendResponse;
  }

  private async getAgentDetails(
    id: string
  ): Promise<CrowdstrikeGetAgentsResponse['resources'][number]> {
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions<
      CrowdstrikeGetAgentsParams,
      SUB_ACTION
    > = {
      params: {
        subAction: SUB_ACTION.GET_AGENT_DETAILS,
        subActionParams: {
          ids: [id],
        },
      },
    };

    let crowdstrikeApiResponse: CrowdstrikeGetAgentsResponse | undefined;

    try {
      const response = await this.connectorActionsClient.execute(executeOptions);

      this.log.debug(`Response for Crowdstrike agent id [${id}] returned:\n${stringify(response)}`);

      crowdstrikeApiResponse = response.data;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Error while attempting to retrieve Crowdstrike host with agent id [${id}]`,
        500,
        err
      );
    }

    if (!crowdstrikeApiResponse || !crowdstrikeApiResponse.resources[0]) {
      throw new ResponseActionsClientError(`Crowdstrike agent id [${id}] not found`, 404);
    }

    return crowdstrikeApiResponse.resources[0];
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO:PT support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for Crowdstrike`,
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
          await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            command: 'contain',
            ...(reqIndexOptions.comment
              ? {
                  actionParameters: {
                    comment: reqIndexOptions.comment,
                  },
                }
              : {}),
          });
        } catch (err) {
          error = err;
          // throw new Error(err);
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

    // TODO TC: probably this should be done in a background task
    // if (!actionRequestDoc.error) {
    //   await this.writeActionResponseToEndpointIndex({
    //     actionId: actionRequestDoc.EndpointActions.action_id,
    //     agentId: actionRequestDoc.agent.id,
    //     data: {
    //       command: actionRequestDoc.EndpointActions.data.command,
    //     },
    //   });
    // }

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
          await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            command: 'lift_containment',
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

    // TODO TC: probably this should be done in a background task
    // if (!actionRequestDoc.error) {
    //   await this.writeActionResponseToEndpointIndex({
    //     actionId: actionRequestDoc.EndpointActions.action_id,
    //     agentId: actionRequestDoc.agent.id,
    //     data: {
    //       command: actionRequestDoc.EndpointActions.data.command,
    //     },
    //   });
    // }

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    // TODO:PT implement resolving of pending crowdstrike actions
    // if (abortSignal.aborted) {
    //   return;
    // }
  }
}
