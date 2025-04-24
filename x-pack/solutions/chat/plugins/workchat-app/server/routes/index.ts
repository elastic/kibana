/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { registerChatRoutes } from './chat';
import { registerConversationRoutes } from './conversation';
import { registerConnectorRoutes } from './connectors';
import { registerIntegrationsRoutes } from './integrations';
import { registerAgentRoutes } from './agents';

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerChatRoutes(dependencies);
  registerConversationRoutes(dependencies);
  registerConnectorRoutes(dependencies);
  registerAgentRoutes(dependencies);
  registerIntegrationsRoutes(dependencies);
};
