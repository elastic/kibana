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
import type {
  SentinelOneGetAgentsResponse,
  SentinelOneGetAgentsParams,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { SentinelOneConnectorExecuteOptions } from './types';
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

export type SentinelOneActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: ActionsClient;
};

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';
  private readonly connectorActionsClient: ActionsClient;
  private readonly getConnector: () => Promise<ConnectorWithExtraFindData>;

  constructor({ connectorActions, ...options }: SentinelOneActionsClientOptions) {
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
    const { id: connectorId } = await this.getConnector();
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      actionId: connectorId,
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

  private async getAgentDetails(id: string): Promise<SentinelOneGetAgentsResponse['data'][number]> {
    const { id: connectorId } = await this.getConnector();
    const executeOptions: SentinelOneConnectorExecuteOptions<SentinelOneGetAgentsParams> = {
      actionId: connectorId,
      params: {
        subAction: SUB_ACTION.GET_AGENTS,
        subActionParams: {
          uuid: id,
        },
      },
    };

    let s1ApiResponse: SentinelOneGetAgentsResponse | undefined;

    try {
      const response = (await this.connectorActionsClient.execute(
        executeOptions
      )) as ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;

      this.log.debug(`Response for SentinelOne agent id [${id}] returned:\n${stringify(response)}`);

      s1ApiResponse = response.data;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Error while attempting to retrieve SentinelOne host with agent id [${id}]`,
        500,
        err
      );
    }

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

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    // TODO:PT implement resolving of pending S1 actions
    // if (abortSignal.aborted) {
    //   return;
    // }
  }
}
