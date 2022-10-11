/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTION_RESPONSES_DS,
  failedFleetActionErrorCode,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActivityLogAction,
  ActivityLogActionResponse,
  ActivityLogEntry,
  EndpointAction,
  EndpointActionDataParameterTypes,
  EndpointActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { ActivityLogItemTypes } from '../../../../common/endpoint/types';
import type { EndpointMetadataService } from '../metadata';
/**
 * Type guard to check if a given Action is in the shape of the Endpoint Action.
 * @param item
 */
export const isLogsEndpointAction = (
  item: LogsEndpointAction | EndpointAction
): item is LogsEndpointAction => {
  return 'EndpointActions' in item && 'user' in item && 'agent' in item && '@timestamp' in item;
};

/**
 * Type guard to track if a given action response is in the shape of the Endpoint Action Response (from the endpoint index)
 * @param item
 */
export const isLogsEndpointActionResponse = (
  item: EndpointActionResponse | LogsEndpointActionResponse
): item is LogsEndpointActionResponse => {
  return 'EndpointActions' in item && 'agent' in item;
};

interface NormalizedActionRequest {
  id: string;
  type: 'ACTION_REQUEST';
  expiration: string;
  agents: string[];
  createdBy: string;
  createdAt: string;
  command: ResponseActionsApiCommandNames;
  comment?: string;
  parameters?: EndpointActionDataParameterTypes;
}

/**
 * Given an Action record - either a fleet action or an endpoint action - this utility
 * will return a normalized data structure based on those two types, which
 * will avoid us having to either cast or do type guards against the two different
 * types of action request.
 */
export const mapToNormalizedActionRequest = (
  actionRequest: EndpointAction | LogsEndpointAction
): NormalizedActionRequest => {
  const type = 'ACTION_REQUEST';
  if (isLogsEndpointAction(actionRequest)) {
    return {
      agents: Array.isArray(actionRequest.agent.id)
        ? actionRequest.agent.id
        : [actionRequest.agent.id],
      command: actionRequest.EndpointActions.data.command,
      comment: actionRequest.EndpointActions.data.comment,
      createdBy: actionRequest.user.id,
      createdAt: actionRequest['@timestamp'],
      expiration: actionRequest.EndpointActions.expiration,
      id: actionRequest.EndpointActions.action_id,
      type,
      parameters: actionRequest.EndpointActions.data.parameters,
    };
  }

  // Else, it's a Fleet Endpoint Action record
  return {
    agents: actionRequest.agents,
    command: actionRequest.data.command,
    comment: actionRequest.data.comment,
    createdBy: actionRequest.user_id,
    createdAt: actionRequest['@timestamp'],
    expiration: actionRequest.expiration,
    id: actionRequest.action_id,
    type,
    parameters: actionRequest.data.parameters,
  };
};

type ActionCompletionInfo = Pick<
  Required<ActionDetails>,
  'isCompleted' | 'completedAt' | 'wasSuccessful' | 'errors' | 'outputs' | 'agentState'
>;

export const getActionCompletionInfo = (
  /** List of agents that the action was sent to */
  agentIds: string[],
  /** List of action Log responses received for the action */
  actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>
): ActionCompletionInfo => {
  const completedInfo: ActionCompletionInfo = {
    completedAt: undefined,
    errors: undefined,
    outputs: {},
    agentState: {},
    isCompleted: Boolean(agentIds.length),
    wasSuccessful: Boolean(agentIds.length),
  };

  const responsesByAgentId: ActionResponseByAgentId = mapActionResponsesByAgentId(actionResponses);

  for (const agentId of agentIds) {
    const agentResponses = responsesByAgentId[agentId];

    // Set the overall Action to not completed if at least
    // one of the agent responses is not complete yet.
    if (!agentResponses || !agentResponses.isCompleted) {
      completedInfo.isCompleted = false;
      completedInfo.wasSuccessful = false;
    }

    // individual agent state
    completedInfo.agentState[agentId] = {
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      completedAt: undefined,
    };

    // Store the outputs and agent state for any agent that has received a response
    if (agentResponses) {
      completedInfo.agentState[agentId].isCompleted = agentResponses.isCompleted;
      completedInfo.agentState[agentId].wasSuccessful = agentResponses.wasSuccessful;
      completedInfo.agentState[agentId].completedAt = agentResponses.completedAt;
      completedInfo.agentState[agentId].errors = agentResponses.errors;

      if (
        agentResponses.endpointResponse &&
        agentResponses.endpointResponse.item.data.EndpointActions.data.output
      ) {
        completedInfo.outputs[agentId] =
          agentResponses.endpointResponse.item.data.EndpointActions.data.output;
      }
    }
  }

  // If completed, then get the completed at date and determine if action as a whole was successful or not
  if (completedInfo.isCompleted) {
    const responseErrors: ActionCompletionInfo['errors'] = [];

    for (const normalizedAgentResponse of Object.values(responsesByAgentId)) {
      if (
        !completedInfo.completedAt ||
        completedInfo.completedAt < (normalizedAgentResponse.completedAt ?? '')
      ) {
        completedInfo.completedAt = normalizedAgentResponse.completedAt;
      }

      if (!normalizedAgentResponse.wasSuccessful) {
        completedInfo.wasSuccessful = false;
        responseErrors.push(
          ...(normalizedAgentResponse.errors ? normalizedAgentResponse.errors : [])
        );
      }
    }

    if (responseErrors.length) {
      completedInfo.errors = responseErrors;
    }
  }

  return completedInfo;
};

export const getActionStatus = ({
  expirationDate,
  isCompleted,
  wasSuccessful,
}: {
  expirationDate: string;
  isCompleted: boolean;
  wasSuccessful: boolean;
}): { status: ActionDetails['status']; isExpired: boolean } => {
  const isExpired = !isCompleted && expirationDate < new Date().toISOString();
  const status = isExpired
    ? 'failed'
    : isCompleted
    ? wasSuccessful
      ? 'successful'
      : 'failed'
    : 'pending';

  return { isExpired, status };
};

interface NormalizedAgentActionResponse {
  isCompleted: boolean;
  completedAt: undefined | string;
  wasSuccessful: boolean;
  errors: undefined | string[];
  fleetResponse: undefined | ActivityLogActionResponse;
  endpointResponse: undefined | EndpointActivityLogActionResponse;
}

type ActionResponseByAgentId = Record<string, NormalizedAgentActionResponse>;

/**
 * Given a list of Action Responses, it will return a Map where keys are the Agent ID and
 * value is a object having information about the action responses associated with that agent id
 * @param actionResponses
 */
const mapActionResponsesByAgentId = (
  actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>
): ActionResponseByAgentId => {
  const response: ActionResponseByAgentId = {};

  for (const actionResponse of actionResponses) {
    const agentId = getAgentIdFromActionResponse(actionResponse);
    let thisAgentActionResponses = response[agentId];

    if (!thisAgentActionResponses) {
      response[agentId] = {
        isCompleted: false,
        completedAt: undefined,
        wasSuccessful: false,
        errors: undefined,
        fleetResponse: undefined,
        endpointResponse: undefined,
      };

      thisAgentActionResponses = response[agentId];
    }

    if (actionResponse.type === 'fleetResponse') {
      thisAgentActionResponses.fleetResponse = actionResponse;
    } else {
      thisAgentActionResponses.endpointResponse = actionResponse;
    }

    thisAgentActionResponses.isCompleted =
      // Action is complete if an Endpoint Action Response was received
      Boolean(thisAgentActionResponses.endpointResponse) ||
      // OR:
      // If we did not have an endpoint response and the Fleet response has `error`, then
      // action is complete. Elastic Agent was unable to deliver the action request to the
      // endpoint, so we are unlikely to ever receive an Endpoint Response.
      Boolean(thisAgentActionResponses.fleetResponse?.item.data.error);

    // When completed, calculate additional properties about the action
    if (thisAgentActionResponses.isCompleted) {
      if (thisAgentActionResponses.endpointResponse) {
        thisAgentActionResponses.completedAt =
          thisAgentActionResponses.endpointResponse?.item.data['@timestamp'];
        thisAgentActionResponses.wasSuccessful = true;
      } else if (
        // Check if perhaps the Fleet action response returned an error, in which case, the Fleet Agent
        // failed to deliver the Action to the Endpoint. If that's the case, we are not going to get
        // a Response from endpoint, thus mark the Action as completed and use the Fleet Message's
        // timestamp for the complete data/time.
        thisAgentActionResponses.fleetResponse &&
        thisAgentActionResponses.fleetResponse.item.data.error
      ) {
        thisAgentActionResponses.isCompleted = true;
        thisAgentActionResponses.completedAt =
          thisAgentActionResponses.fleetResponse.item.data['@timestamp'];
      }

      const errors: NormalizedAgentActionResponse['errors'] = [];

      // only one of the errors should be in there
      if (thisAgentActionResponses.endpointResponse?.item.data.error?.message) {
        errors.push(
          `Endpoint action response error: ${thisAgentActionResponses.endpointResponse.item.data.error.message}`
        );
      }

      if (thisAgentActionResponses.fleetResponse?.item.data.error) {
        errors.push(
          `Fleet action response error: ${thisAgentActionResponses.fleetResponse?.item.data.error}`
        );
      }

      if (errors.length) {
        thisAgentActionResponses.wasSuccessful = false;
        thisAgentActionResponses.errors = errors;
      }
    }
  }

  return response;
};

/**
 * Given an Action response, this will return the Agent ID for that action response.
 * @param actionResponse
 */
const getAgentIdFromActionResponse = (
  actionResponse: ActivityLogActionResponse | EndpointActivityLogActionResponse
): string => {
  const responseData = actionResponse.item.data;

  if (isLogsEndpointActionResponse(responseData)) {
    return Array.isArray(responseData.agent.id) ? responseData.agent.id[0] : responseData.agent.id;
  }

  return responseData.agent_id;
};

// common helpers used by old and new log API
export const getDateFilters = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) => {
  const dateFilters = [];
  if (startDate) {
    dateFilters.push({ range: { '@timestamp': { gte: startDate } } });
  }
  if (endDate) {
    dateFilters.push({ range: { '@timestamp': { lte: endDate } } });
  }
  return dateFilters;
};

export const getUniqueLogData = (activityLogEntries: ActivityLogEntry[]): ActivityLogEntry[] => {
  // find the error responses for actions that didn't make it to fleet index
  const onlyResponsesForFleetErrors: string[] = activityLogEntries.reduce<string[]>((acc, curr) => {
    if (
      curr.type === ActivityLogItemTypes.RESPONSE &&
      curr.item.data.error?.code === failedFleetActionErrorCode
    ) {
      acc.push(curr.item.data.EndpointActions.action_id);
    }
    return acc;
  }, []);

  // all actions and responses minus endpoint actions.
  const nonEndpointActionsDocs = activityLogEntries.filter(
    (e) => e.type !== ActivityLogItemTypes.ACTION
  );

  // only endpoint actions that match the error responses
  const onlyEndpointActionsDocWithoutFleetActions: ActivityLogEntry[] = activityLogEntries.filter(
    (e) =>
      e.type === ActivityLogItemTypes.ACTION &&
      onlyResponsesForFleetErrors.includes(
        (e.item.data as LogsEndpointAction).EndpointActions.action_id
      )
  );

  // join the error actions and the rest
  return [...nonEndpointActionsDocs, ...onlyEndpointActionsDocWithoutFleetActions];
};

export const hasAckInResponse = (response: EndpointActionResponse): boolean => {
  return response.action_response?.endpoint?.ack ?? false;
};

// return TRUE if for given action_id/agent_id
// there is no doc in .logs-endpoint.action.response-default
export const hasNoEndpointResponse = ({
  action,
  agentId,
  indexedActionIds,
}: {
  action: EndpointAction;
  agentId: string;
  indexedActionIds: string[];
}): boolean => {
  return action.agents.includes(agentId) && !indexedActionIds.includes(action.action_id);
};

// return TRUE if for given action_id/agent_id
// there is no doc in .fleet-actions-results
export const hasNoFleetResponse = ({
  action,
  agentId,
  agentResponses,
}: {
  action: EndpointAction;
  agentId: string;
  agentResponses: EndpointActionResponse[];
}): boolean => {
  return (
    action.agents.includes(agentId) &&
    !agentResponses.map((e) => e.action_id).includes(action.action_id)
  );
};

const matchesDsNamePattern = ({
  dataStreamName,
  index,
}: {
  dataStreamName: string;
  index: string;
}): boolean => index.includes(dataStreamName);

export const categorizeResponseResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>>;
}): Array<ActivityLogActionResponse | EndpointActivityLogActionResponse> => {
  return results?.length
    ? results?.map((e) => {
        const isResponseDoc: boolean = matchesDsNamePattern({
          dataStreamName: ENDPOINT_ACTION_RESPONSES_DS,
          index: e._index,
        });
        return isResponseDoc
          ? {
              type: ActivityLogItemTypes.RESPONSE,
              item: { id: e._id, data: e._source as LogsEndpointActionResponse },
            }
          : {
              type: ActivityLogItemTypes.FLEET_RESPONSE,
              item: { id: e._id, data: e._source as EndpointActionResponse },
            };
      })
    : [];
};

export const categorizeActionResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointAction | LogsEndpointAction>>;
}): Array<ActivityLogAction | EndpointActivityLogAction> => {
  return results?.length
    ? results?.map((e) => {
        const isActionDoc: boolean = matchesDsNamePattern({
          dataStreamName: ENDPOINT_ACTIONS_DS,
          index: e._index,
        });
        return isActionDoc
          ? {
              type: ActivityLogItemTypes.ACTION,
              item: { id: e._id, data: e._source as LogsEndpointAction },
            }
          : {
              type: ActivityLogItemTypes.FLEET_ACTION,
              item: { id: e._id, data: e._source as EndpointAction },
            };
      })
    : [];
};

// for 8.4+ we only search on endpoint actions index
// and thus there are only endpoint actions in the results
export const formatEndpointActionResults = (
  results: Array<estypes.SearchHit<LogsEndpointAction>>
): EndpointActivityLogAction[] => {
  return results?.length
    ? results?.map((e) => {
        return {
          type: ActivityLogItemTypes.ACTION,
          item: { id: e._id, data: e._source as LogsEndpointAction },
        };
      })
    : [];
};

export const getAgentHostNamesWithIds = async ({
  esClient,
  agentIds,
  metadataService,
}: {
  esClient: ElasticsearchClient;
  agentIds: string[];
  metadataService: EndpointMetadataService;
}): Promise<{ [id: string]: string }> => {
  // get host metadata docs with queried agents
  const metaDataDocs = await metadataService.findHostMetadataForFleetAgents(esClient, [
    ...new Set(agentIds),
  ]);
  // agent ids and names from metadata
  // map this into an object as {id1: name1, id2: name2} etc
  const agentsMetadataInfo = agentIds.reduce<{ [id: string]: string }>((acc, id) => {
    acc[id] = metaDataDocs.find((doc) => doc.agent.id === id)?.host.hostname ?? '';
    return acc;
  }, {});

  return agentsMetadataInfo;
};
