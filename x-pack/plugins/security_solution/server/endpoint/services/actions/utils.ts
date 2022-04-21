/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAction, LogsEndpointAction } from '../../../../common/endpoint/types';

/**
 * Type guard to check if a given Action is in the shape of the Endpoint Action.
 * @param item
 */
export const isLogsEndpointAction = (
  item: LogsEndpointAction | EndpointAction
): item is LogsEndpointAction => {
  return (
    'EndpointActions' in item &&
    'error' in item &&
    'user' in item &&
    'agent' in item &&
    '@timestamp' in item
  );
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
 * will avoid us having to either cast or do type guards agains the two different
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

  // Else, its a Fleet Endpoint Action record
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
