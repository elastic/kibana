/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FindActionResult } from '@kbn/actions-plugin/server';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const listConnectorsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/connectors',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<FindActionResult[]> => {
    const { request, plugins } = resources;

    const actionsClient = await (
      await plugins.actions.start()
    ).getActionsClientWithRequest(request);

    const connectors = await actionsClient.getAll();

    return connectors.filter((connector) => connector.actionTypeId === '.gen-ai');
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
};
