/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTokenRouteDefinition } from './get_token_route';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';
import { hostActionsRouteDefinition } from './host_actions_route';
import { getAgentDetailsRouteDefinition } from './get_agent_details_route';
import { getAgentOnlineStatusRouteDefinition } from './get_agent_online_status_route';

export const getCrowdstrikeRouteDefinitions = (): EmulatorServerRouteDefinition[] => {
  return [
    getTokenRouteDefinition(),
    hostActionsRouteDefinition(),
    getAgentDetailsRouteDefinition(),
    getAgentOnlineStatusRouteDefinition(),
  ];
};
