/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActivityLogActionResponse,
  EndpointAction,
  EndpointActionResponse,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';

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
  command: string;
  comment?: string;
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
  if (isLogsEndpointAction(actionRequest)) {
    return {
      agents: Array.isArray(actionRequest.agent.id)
        ? actionRequest.agent.id
        : [actionRequest.agent.id],
      command: actionRequest.EndpointActions.data.command,
      comment: actionRequest.EndpointActions.data.command,
      type: 'ACTION_REQUEST',
      id: actionRequest.EndpointActions.action_id,
      expiration: actionRequest.EndpointActions.expiration,
      createdBy: actionRequest.user.id,
      createdAt: actionRequest['@timestamp'],
    };
  }

  // Else, it's a Fleet Endpoint Action record
  return {
    agents: actionRequest.agents,
    command: actionRequest.data.command,
    comment: actionRequest.data.command,
    type: 'ACTION_REQUEST',
    id: actionRequest.action_id,
    expiration: actionRequest.expiration,
    createdBy: actionRequest.user_id,
    createdAt: actionRequest['@timestamp'],
  };
};

interface ActionCompletionInfo {
  isCompleted: boolean;
  completedAt: undefined | string;
  wasSuccessful: boolean;
  errors: undefined | string[];
}

export const getActionCompletionInfo = (
  /** List of agents that the action was sent to */
  agentIds: string[],
  /** List of action Log responses received for the action */
  actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>
): ActionCompletionInfo => {
  const completedInfo: ActionCompletionInfo = {
    isCompleted: Boolean(agentIds.length),
    completedAt: undefined,
    wasSuccessful: Boolean(agentIds.length),
    errors: undefined,
  };

  const responsesByAgentId = mapActionResponsesByAgentId(actionResponses);

  for (const agentId of agentIds) {
    if (!responsesByAgentId[agentId] || !responsesByAgentId[agentId].isCompleted) {
      completedInfo.isCompleted = false;
      completedInfo.wasSuccessful = false;
      break;
    }
  }

  // If completed, then get the completed at date and determine if action was successful or not
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
 * value is a object having information about the action response's associated with that agent id
 * @param actionResponses
 */
const mapActionResponsesByAgentId = (
  actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>
): ActionResponseByAgentId => {
  const response: ActionResponseByAgentId = {};

  for (const actionResponse of actionResponses) {
    if (actionResponse.type === 'fleetResponse' || actionResponse.type === 'response') {
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
