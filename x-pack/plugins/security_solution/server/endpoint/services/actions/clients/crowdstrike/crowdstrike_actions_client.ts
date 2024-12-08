/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import {
  SUB_ACTION,
  CROWDSTRIKE_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CrowdstrikeBaseApiResponse } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { v4 as uuidv4 } from 'uuid';
import type { RunScriptActionRequestBody } from '../../../../../../common/api/endpoint/actions/response_actions/crowdstrike/run_script';
import type {
  CrowdstrikeActionRequestCommonMeta,
  CrowdStrikeActionRunScriptOutputContent,
  CrowdStrikeActionsRunScriptParameters,
} from '../../../../../../common/endpoint/types/crowdstrike';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
  ResponseActionsClientValidateRequestResponse,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';
import type {
  NormalizedExternalConnectorClient,
  NormalizedExternalConnectorClientExecuteOptions,
} from '../lib/normalized_external_connector_client';

export type CrowdstrikeActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: NormalizedExternalConnectorClient;
};

export class CrowdstrikeActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: CrowdstrikeActionsClientOptions) {
    super(options);
    this.connectorActionsClient = connectorActions;
    connectorActions.setup(CROWDSTRIKE_CONNECTOR_ID);
  }

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      TMeta
    >
  ): Promise<
    LogsEndpointAction<TParameters, TOutputContent, TMeta & CrowdstrikeActionRequestCommonMeta>
  > {
    const agentId = actionRequest.endpoint_ids[0];
    const hostname = await this.getHostNameByAgentId(agentId);

    return super.writeActionRequestToEndpointIndex({
      ...actionRequest,
      hosts: {
        [agentId]: { name: hostname },
      },
      meta: {
        hostName: hostname,
        ...(actionRequest.meta ?? {}),
      } as TMeta & CrowdstrikeActionRequestCommonMeta,
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
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      () =>
        `calling connector actions 'execute()' for Crowdstrike with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to Crowdstrike failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    } else {
      this.log.debug(() => `Response:\n${stringify(actionSendResponse)}`);
    }

    return actionSendResponse;
  }

  private async getHostNameByAgentId(agentId: string): Promise<string> {
    const search = {
      // Multiple indexes:  .falcon, .fdr, .host, .alert
      index: ['logs-crowdstrike*'],
      size: 1,
      _source: ['host.hostname', 'host.name'],
      body: {
        query: {
          bool: {
            filter: [{ term: { 'device.id': agentId } }],
          },
        },
      },
    };
    try {
      const result: SearchResponse<{ host: { name: string; hostname: string } }> =
        await this.options.esClient.search<{ host: { name: string; hostname: string } }>(search, {
          ignore: [404],
        });

      // Check if host name exists
      const host = result.hits.hits?.[0]?._source?.host;
      const hostName = host?.name || host?.hostname;
      if (!hostName) {
        throw new ResponseActionsClientError(
          `Host name not found in the event document for agentId: ${agentId}`,
          404
        );
      }

      return hostName;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Failed to fetch event document: ${err.message}`,
        err.statusCode ?? 500,
        err
      );
    }
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
    let actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse> | undefined;
    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;
      if (!error) {
        if (!reqIndexOptions.actionId) {
          reqIndexOptions.actionId = uuidv4();
        }

        try {
          actionResponse = (await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            actionParameters: { comment: this.buildExternalComment(reqIndexOptions) },
            command: 'contain',
          })) as ActionTypeExecutorResult<CrowdstrikeBaseApiResponse>;
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

    // Ensure actionResponse is assigned before using it
    if (actionResponse) {
      await this.completeCrowdstrikeAction(actionResponse, actionRequestDoc);
    }

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

  async release(
    actionRequest: UnisolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    let actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse> | undefined;
    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          actionResponse = (await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            command: 'lift_containment',
            comment: this.buildExternalComment(reqIndexOptions),
          })) as ActionTypeExecutorResult<CrowdstrikeBaseApiResponse>;
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

    // Ensure actionResponse is assigned before using it
    if (actionResponse) {
      await this.completeCrowdstrikeAction(actionResponse, actionRequestDoc);
    }

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

  public async runscript<
    TRequest = RunScriptActionRequestBody,
    TOutput = CrowdStrikeActionRunScriptOutputContent,
    TParameters = CrowdStrikeActionsRunScriptParameters
  >(
    actionRequest: TRequest,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<TOutput, TParameters>> {
    // TODO: just a placeholder for now
    return Promise.resolve({ output: 'runscript' }) as never as ActionDetails<TOutput, TParameters>;
  }

  private async completeCrowdstrikeAction(
    actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse> | undefined,
    doc: LogsEndpointAction
  ): Promise<void> {
    const options = {
      actionId: doc.EndpointActions.action_id,
      agentId: doc.agent.id,
      data: doc.EndpointActions.data,
      ...(actionResponse?.data?.errors?.length
        ? {
            error: {
              code: '500',
              message: `Crowdstrike action failed: ${actionResponse.data.errors[0].message}`,
            },
          }
        : {}),
    };

    await this.writeActionResponseToEndpointIndex(options);
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
