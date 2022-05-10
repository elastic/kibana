/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommandDefinition } from '../console';
import { IsolateActionResult } from './isolate_action';
import { EndpointStatusActionResult } from './status_action';

export const getEndpointResponseActionsConsoleCommands = (
  endpointAgentId: string
): CommandDefinition[] => {
  return [
    {
      name: 'isolate',
      about: 'Isolate the host',
      RenderComponent: IsolateActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: 'A comment to go along with the action',
        },
      },
    },
    {
      name: 'status',
      about: 'Display the latest status information for the Endpoint',
      RenderComponent: EndpointStatusActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
    },
  ];
};
