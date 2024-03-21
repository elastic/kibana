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
import { groupBy, once } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  SentinelOneGetAgentsResponse,
  SentinelOneGetAgentsParams,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { catchAndWrapError } from '../../../../utils';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import type {
  SentinelOneConnectorExecuteOptions,
  SentinelOneIsolationRequestMeta,
  SentinelOneActionRequestCommonMeta,
  SentinelOneIsolationResponseMeta,
  SentinelOneActivityDoc,
} from './types';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  LogsEndpointAction,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointActionResponse,
} from '../../../../../../common/endpoint/types';
import type { IsolationRouteRequestBody } from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
  ResponseActionsClientValidateRequestResponse,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';

const SENTINEL_ONE_ACTIVITY_INDEX = 'logs-sentinel_one.activity-default';

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

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = SentinelOneActionRequestCommonMeta
  >(
    actionRequest: Omit<ResponseActionsClientWriteActionRequestToEndpointIndexOptions, 'hosts'>
  ): Promise<LogsEndpointAction<TParameters, TOutputContent, TMeta>> {
    const agentUUID = actionRequest.endpoint_ids[0];
    const agentDetails = await this.getAgentDetails(agentUUID);

    return super.writeActionRequestToEndpointIndex<TParameters, TOutputContent, TMeta>({
      ...actionRequest,
      hosts: {
        [agentUUID]: { name: agentDetails.computerName },
      },
      meta: {
        // Add common meta data
        agentUUID,
        agentId: agentDetails.id,
        hostName: agentDetails.computerName,
        ...(actionRequest.meta ?? {}),
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

  private async getAgentDetails(
    agentUUID: string
  ): Promise<SentinelOneGetAgentsResponse['data'][number]> {
    const { id: connectorId } = await this.getConnector();
    const executeOptions: SentinelOneConnectorExecuteOptions<SentinelOneGetAgentsParams> = {
      actionId: connectorId,
      params: {
        subAction: SUB_ACTION.GET_AGENTS,
        subActionParams: {
          uuid: agentUUID,
        },
      },
    };

    let s1ApiResponse: SentinelOneGetAgentsResponse | undefined;

    try {
      const response = (await this.connectorActionsClient.execute(
        executeOptions
      )) as ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;

      this.log.debug(
        `Response for SentinelOne agent id [${agentUUID}] returned:\n${stringify(response)}`
      );

      s1ApiResponse = response.data;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Error while attempting to retrieve SentinelOne host with agent id [${agentUUID}]`,
        500,
        err
      );
    }

    if (!s1ApiResponse || !s1ApiResponse.data[0]) {
      throw new ResponseActionsClientError(`SentinelOne agent id [${agentUUID}] not found`, 404);
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
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      SentinelOneIsolationRequestMeta
    > = {
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

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async release(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      SentinelOneIsolationRequestMeta
    > = {
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

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    if (abortSignal.aborted) {
      return;
    }

    for await (const pendingActions of this.fetchAllPendingActions()) {
      if (abortSignal.aborted) {
        return;
      }

      const pendingActionsByType = groupBy(pendingActions, 'EndpointActions.data.command');

      for (const [actionType, typePendingActions] of Object.entries(pendingActionsByType)) {
        if (abortSignal.aborted) {
          return;
        }

        switch (actionType as ResponseActionsApiCommandNames) {
          case 'isolate':
          case 'unisolate':
            addToQueue(
              ...(await this.checkPendingIsolateOrReleaseActions(
                typePendingActions as Array<
                  LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>
                >,
                actionType as 'isolate' | 'unisolate'
              ))
            );
            break;
        }
      }
    }
  }

  /**
   * Checks if the provided Isolate or Unisolate actions are complete and if so, then it builds the Response
   * document for them and returns it. (NOTE: the response is NOT written to ES - only returned)
   * @param actionRequests
   * @param command
   * @private
   */
  private async checkPendingIsolateOrReleaseActions(
    actionRequests: Array<LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>>,
    command: ResponseActionsApiCommandNames & ('isolate' | 'unisolate')
  ): Promise<LogsEndpointActionResponse[]> {
    const completedResponses: LogsEndpointActionResponse[] = [];
    const actionsByAgentId: {
      [s1AgentId: string]: Array<
        LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>
      >;
    } = {};
    const warnings: string[] = [];

    // TODO:PT need to ensure that we ignore when the index does not exist

    const query: QueryDslQueryContainer = {
      bool: {
        must: [
          {
            term: {
              // Activity Types can be retrieved from S1 via API: `/web/api/v2.1/activities/types`
              'sentinel_one.activity.type':
                command === 'isolate'
                  ? [
                      // {
                      //    "id": 1001
                      //    "action": "Agent Disconnected From Network",
                      //    "descriptionTemplate": "Agent {{ computer_name }} was disconnected from network.",
                      // },
                      1001,

                      // {
                      //    "id": 2010
                      //    "action": "Agent Mitigation Report Quarantine Network Failed",
                      //    "descriptionTemplate": "Agent {{ computer_name }} was unable to disconnect from network.",
                      // },
                      2010,
                    ]
                  : [
                      // {
                      //    "id": 1002
                      //    "action": "Agent Reconnected To Network",
                      //    "descriptionTemplate": "Agent {{ computer_name }} was connected to network.",
                      // },
                      1002,
                    ],
            },
          },
        ],
        // Create an `OR` clause that filters for each agent id an an updated date of greater than the date when
        // the isolate request was created
        should: actionRequests.reduce((acc, action) => {
          const s1AgentId = action.meta?.agentId;

          if (s1AgentId) {
            if (!actionsByAgentId[s1AgentId]) {
              actionsByAgentId[s1AgentId] = [];
            }

            actionsByAgentId[s1AgentId].push(action);

            acc.push({
              bool: {
                filter: [
                  { term: { 'sentinel_one.activity.agent.id': s1AgentId } },
                  { range: { 'sentinel_one.activity.updated_at': { gt: action['@timestamp'] } } },
                ],
              },
            });
          } else {
            // This is an edge case and should never happen. But just in case :-)
            warnings.push(
              `${command} response action ID [${action.EndpointActions.action_id}] missing SentinelOne agent ID, thus unable to check on it's status. Forcing it to complete as failure.`
            );

            completedResponses.push(
              this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
                actionId: action.EndpointActions.action_id,
                agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
                data: { command: 'isolate' },
                error: {
                  message: `Unable to very if action completed. SentinelOne agent id ('meta.agentId') missing on action request document!`,
                },
              })
            );
          }

          return acc;
        }, [] as QueryDslQueryContainer[]),
        minimum_should_match: 1,
      },
    };

    this.log.debug(
      `searching for ${command} responses from [${SENTINEL_ONE_ACTIVITY_INDEX}] index with query:\n${stringify(
        query
      )}`
    );

    const searchResults = await this.options.esClient
      .search<SentinelOneActivityDoc>({
        index: SENTINEL_ONE_ACTIVITY_INDEX,
        query,
        // There may be many documents for each host/agent, so we collapse it and only get back the
        // first one that came in after the isolate request was sent
        collapse: {
          field: 'sentinel_one.activity.agent.id',
          inner_hits: {
            name: 'first_found',
            size: 1,
            sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
          },
        },
        _source: false,
        sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        size: 1000,
      })
      .catch(catchAndWrapError);

    this.log.debug(
      `Search results for SentinelOne ${command} activity documents:\n${stringify(searchResults)}`
    );

    for (const searchResultHit of searchResults.hits.hits) {
      const isolateActivityResponseDoc = searchResultHit.inner_hits?.first_found.hits
        .hits[0] as SearchHit<SentinelOneActivityDoc>;

      if (isolateActivityResponseDoc && isolateActivityResponseDoc._source) {
        const s1ActivityData = isolateActivityResponseDoc._source.sentinel_one.activity;

        const elasticDocId = isolateActivityResponseDoc._id;
        const s1AgentId = s1ActivityData.agent.id;
        const activityLogEntryId = s1ActivityData.id;
        const activityLogEntryType = s1ActivityData.type;
        const activityLogEntryDescription = s1ActivityData.description.primary;

        for (const actionRequest of actionsByAgentId[s1AgentId]) {
          completedResponses.push(
            this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
              actionId: actionRequest.EndpointActions.action_id,
              agentId: Array.isArray(actionRequest.agent.id)
                ? actionRequest.agent.id[0]
                : actionRequest.agent.id,
              data: { command },
              error:
                activityLogEntryType === 2010 && command === 'isolate'
                  ? {
                      message:
                        activityLogEntryDescription ??
                        `Action failed. SentinelOne activity log entry [${activityLogEntryId}] has a 'type' value of 2010 indicating a failure to disconnect`,
                    }
                  : undefined,
              meta: {
                elasticDocId,
                activityLogEntryId,
                activityLogEntryType,
                activityLogEntryDescription,
              },
            })
          );
        }
      }
    }

    this.log.debug(`${command} action responses generated:\n${stringify(completedResponses)}`);

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }
}
