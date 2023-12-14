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
import { ResponseActionsClientError } from '../errors';
import type { ActionDetails } from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  BaseActionRequestBody,
} from '../../../../../../common/api/endpoint';
import type { ResponseActionsClientOptions } from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';

export type SentinelOneActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: ActionsClient;
};

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
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
      `calling connector actions 'execute()' for SentinelOne with:\n${dump(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(dump(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(`Response:\n${dump(actionSendResponse)}`);

    return actionSendResponse;
  }

  private async validateRequest(payload: BaseActionRequestBody): Promise<void> {
    if (payload.endpoint_ids.length > 1) {
      throw new ResponseActionsClientError(
        `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
        400
      );
    }
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    // TODO:PT support multiple agents
    await this.validateRequest(options);

    const agentUUID = options.endpoint_ids[0];

    await this.sendAction(SUB_ACTION.ISOLATE_HOST, {
      uuid: agentUUID,
    });

    // FIXME:PT need to grab data from the response above and store it with the Request or Response documents on our side

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex({
      ...options,
      command: 'isolate',
    });

    // TODO: un-comment code below once we have proper authz given to `kibana_system` account (security issue #8190)
    // await this.writeActionResponseToEndpointIndex({
    //   actionId: actionRequestDoc.EndpointActions.action_id,
    //   agentId: actionRequestDoc.agent.id,
    //   data: {
    //     command: actionRequestDoc.EndpointActions.data.command,
    //   },
    // });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }
}
