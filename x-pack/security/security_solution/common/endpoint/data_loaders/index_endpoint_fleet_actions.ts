/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ResponseActionsApiCommandNames } from '../service/response_actions/constants';
import { EndpointError } from '../errors';
import { usageTracker } from './usage_tracker';
import type {
  EndpointAction,
  EndpointActionResponse,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../types';
import { ENDPOINT_ACTION_RESPONSES_INDEX, ENDPOINT_ACTIONS_INDEX } from '../constants';
import { FleetActionGenerator } from '../data_generators/fleet_action_generator';
import { wrapErrorAndRejectPromise } from './utils';
import { EndpointActionGenerator } from '../data_generators/endpoint_action_generator';

const fleetActionGenerator = new FleetActionGenerator();
const endpointActionGenerator = new EndpointActionGenerator();

export interface IndexedEndpointAndFleetActionsForHostResponse {
  actions: EndpointAction[];
  actionResponses: EndpointActionResponse[];
  actionsIndex: string;
  responsesIndex: string;
  /** @deprecated */
  endpointActions: LogsEndpointAction[];
  /** @deprecated */
  endpointActionResponses: LogsEndpointActionResponse[];
  endpointActionsIndex: string;
  endpointActionResponsesIndex: string;
}

export interface IndexEndpointAndFleetActionsForHostOptions {
  numResponseActions?: number;
  alertIds?: string[];
}

/**
 * Indexes a random number of Endpoint (via Fleet) Actions for a given host
 * (NOTE: ensure that fleet is set up first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param options
 */
export const indexEndpointAndFleetActionsForHost = usageTracker.track(
  'indexEndpointAndFleetActionsForHost',
  async (
    esClient: Client,
    endpointHost: HostMetadata,
    options: IndexEndpointAndFleetActionsForHostOptions = {}
  ): Promise<IndexedEndpointAndFleetActionsForHostResponse> => {
    const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
    const actionsCount = options.numResponseActions ?? 1;
    const total =
      actionsCount === 1 ? actionsCount : fleetActionGenerator.randomN(5) + actionsCount;
    const hostActions = buildIEndpointAndFleetActionsBulkOperations({
      endpoints: [endpointHost],
      count: total,
      alertIds: options.alertIds,
    });
    const response: IndexedEndpointAndFleetActionsForHostResponse = {
      actions: hostActions.actions,
      actionResponses: hostActions.actionResponses,
      endpointActions: [],
      endpointActionResponses: [],
      actionsIndex: AGENT_ACTIONS_INDEX,
      responsesIndex: AGENT_ACTIONS_RESULTS_INDEX,
      endpointActionsIndex: ENDPOINT_ACTIONS_INDEX,
      endpointActionResponsesIndex: ENDPOINT_ACTION_RESPONSES_INDEX,
    };

    const bulkResponse = await esClient
      .bulk(
        {
          operations: hostActions.operations,
          refresh: 'wait_for',
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    if (bulkResponse.errors) {
      throw new EndpointError(
        `indexEndpointAndFleetActionsForHost(): ES Bulk action failed\n\n${JSON.stringify(
          bulkResponse,
          null,
          2
        )}`,
        bulkResponse
      );
    }

    return response;
  }
);

interface BuildIEndpointAndFleetActionsBulkOperationsOptions {
  endpoints: HostMetadata[];
  /** Number of response actions to create per endpoint host. Default: 1 */
  count?: number;
  /** List of alerts that should be associated with the action */
  alertIds?: string[];
}

interface BuildIEndpointAndFleetActionsBulkOperationsResponse
  extends IndexedEndpointAndFleetActionsForHostResponse {
  operations: Required<BulkRequest>['operations'];
}

const getAutomatedActionsSample = (): Array<{
  command: ResponseActionsApiCommandNames;
  config?: { overwrite: boolean };
}> => [
  { command: 'isolate' },
  { command: 'suspend-process', config: { overwrite: true } },
  { command: 'kill-process', config: { overwrite: true } },
];

export const buildIEndpointAndFleetActionsBulkOperations = ({
  endpoints,
  count = 1,
  alertIds,
}: BuildIEndpointAndFleetActionsBulkOperationsOptions): BuildIEndpointAndFleetActionsBulkOperationsResponse => {
  const bulkOperations: BulkRequest['operations'] = [];
  const response: BuildIEndpointAndFleetActionsBulkOperationsResponse = {
    operations: bulkOperations,
    actions: [],
    actionResponses: [],
    actionsIndex: AGENT_ACTIONS_INDEX,
    responsesIndex: AGENT_ACTIONS_RESULTS_INDEX,
    endpointActionsIndex: ENDPOINT_ACTIONS_INDEX,
    endpointActionResponsesIndex: ENDPOINT_ACTION_RESPONSES_INDEX,
    endpointActions: [],
    endpointActionResponses: [],
  };

  for (const endpoint of endpoints) {
    const agentId = endpoint.elastic.agent.id;

    const automatedActions = getAutomatedActionsSample();
    for (let i = 0; i < count; i++) {
      // start with endpoint action
      const logsEndpointAction: LogsEndpointAction = endpointActionGenerator.generate({
        EndpointActions: {
          data: {
            comment: 'data generator: this host is bad',
            ...(alertIds ? automatedActions[i] : {}),
          },
        },
      });

      const fleetAction: EndpointAction = {
        ...logsEndpointAction.EndpointActions,
        '@timestamp': logsEndpointAction['@timestamp'],
        agents:
          typeof logsEndpointAction.agent.id === 'string'
            ? [logsEndpointAction.agent.id]
            : logsEndpointAction.agent.id,
        user_id: logsEndpointAction.user.id,
      };

      bulkOperations.push({ create: { _index: AGENT_ACTIONS_INDEX } }, fleetAction);

      const logsEndpointActionsBody: LogsEndpointAction = {
        ...logsEndpointAction,
        EndpointActions: {
          ...logsEndpointAction.EndpointActions,
          data: {
            ...logsEndpointAction.EndpointActions.data,
            alert_id: alertIds,
          },
        },
        // to test automated actions in cypress
        user: alertIds ? { id: 'unknown' } : logsEndpointAction.user,
        rule: alertIds
          ? {
              id: 'generated_rule_id',
              name: 'generated_rule_name',
            }
          : logsEndpointAction.rule,
      };

      bulkOperations.push(
        {
          create: { _index: ENDPOINT_ACTIONS_INDEX },
        },
        logsEndpointActionsBody
      );

      const randomFloat = fleetActionGenerator.randomFloat();
      // Create an action response for the above
      const fleetActionResponse: EndpointActionResponse = fleetActionGenerator.generateResponse({
        action_id: logsEndpointAction.EndpointActions.action_id,
        agent_id: agentId,
        action_response: {
          endpoint: {
            // add ack to 4/5th of fleet response
            ack: randomFloat < 0.8 ? true : undefined,
          },
        },
        // error for 1/10th of responses
        error: randomFloat < 0.1 ? 'some error happened' : undefined,
      });

      bulkOperations.push(
        {
          create: { _index: AGENT_ACTIONS_RESULTS_INDEX },
        },
        fleetActionResponse
      );

      // 70% has endpoint response
      if (randomFloat < 0.7) {
        const endpointActionResponseBody = {
          EndpointActions: {
            ...fleetActionResponse,
            data: fleetActionResponse.action_data,
            '@timestamp': undefined,
            action_data: undefined,
            agent_id: undefined,
            error: undefined,
          },
          agent: {
            id: agentId,
          },
          // error for 1/10th of responses
          error:
            randomFloat < 0.1
              ? {
                  message: fleetActionResponse.error,
                }
              : undefined,
          '@timestamp': fleetActionResponse['@timestamp'],
        };

        bulkOperations.push(
          {
            create: { _index: ENDPOINT_ACTION_RESPONSES_INDEX },
          },
          endpointActionResponseBody
        );
      }

      response.actions.push(fleetAction);
      response.actionResponses.push(fleetActionResponse);
    }

    // -------------------------------------------
    // Add edge case fleet actions (maybe)
    // -------------------------------------------
    if (fleetActionGenerator.randomFloat() < 0.3) {
      const randomFloat = fleetActionGenerator.randomFloat();

      const actionStartedAt = {
        '@timestamp': new Date().toISOString(),
      };
      // 70% of the time just add either an Isolate -OR- an UnIsolate action
      if (randomFloat < 0.7) {
        let fleetAction: EndpointAction;

        if (randomFloat < 0.3) {
          // add a pending isolation
          fleetAction = fleetActionGenerator.generateIsolateAction(actionStartedAt);
        } else {
          // add a pending UN-isolation
          fleetAction = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);
        }

        fleetAction.agents = [agentId];
        bulkOperations.push(
          {
            create: { _index: AGENT_ACTIONS_INDEX },
          },
          fleetAction
        );

        response.actions.push(fleetAction);
      } else {
        // Else (30% of the time) add a pending isolate AND pending un-isolate
        const fleetAction1 = fleetActionGenerator.generateIsolateAction(actionStartedAt);
        const fleetAction2 = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);

        fleetAction1.agents = [agentId];
        fleetAction2.agents = [agentId];

        bulkOperations.push(
          {
            create: { _index: AGENT_ACTIONS_INDEX },
          },
          fleetAction1
        );

        bulkOperations.push(
          {
            create: { _index: AGENT_ACTIONS_INDEX },
          },
          fleetAction2
        );

        response.actions.push(fleetAction1, fleetAction2);
      }
    }
  }

  return response;
};

export interface DeleteIndexedEndpointFleetActionsResponse {
  actions: estypes.DeleteByQueryResponse | undefined;
  responses: estypes.DeleteByQueryResponse | undefined;
  endpointActionRequests: estypes.DeleteByQueryResponse | undefined;
  endpointActionResponses: estypes.DeleteByQueryResponse | undefined;
}

export const deleteIndexedEndpointAndFleetActions = async (
  esClient: Client,
  indexedData: IndexedEndpointAndFleetActionsForHostResponse
): Promise<DeleteIndexedEndpointFleetActionsResponse> => {
  const response: DeleteIndexedEndpointFleetActionsResponse = {
    actions: undefined,
    responses: undefined,
    endpointActionRequests: undefined,
    endpointActionResponses: undefined,
  };

  if (indexedData.actions.length) {
    [response.actions, response.endpointActionRequests] = await Promise.all([
      esClient
        .deleteByQuery({
          index: `${indexedData.actionsIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  { terms: { action_id: indexedData.actions.map((action) => action.action_id) } },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
      esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionsIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  { terms: { action_id: indexedData.actions.map((action) => action.action_id) } },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
    ]);
  }

  if (indexedData.actionResponses) {
    [response.responses, response.endpointActionResponses] = await Promise.all([
      esClient
        .deleteByQuery({
          index: `${indexedData.responsesIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.actionResponses.map((action) => action.action_id),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
      esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionResponsesIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.actionResponses.map((action) => action.action_id),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
    ]);
  }

  return response;
};
