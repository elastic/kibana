/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getLogAiInsights } from './get_log_ai_insights';

const observabilityAgentBuilderAiInsightsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/agent_builder/ai_insight/log',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [apiPrivileges.readOnechat],
    },
  },
  params: t.type({
    body: t.type({
      fields: t.record(t.string, t.any),
      connectorId: t.union([t.string, t.undefined]),
    }),
  }),
  handler: async (resources): Promise<{ context: string; summary: string }> => {
    const { params, plugins } = resources;

    const { fields, connectorId: lastUsedConnectorId } = params.body;

    if (!plugins.inference) {
      throw new Error('Unable to generate AI insights');
    }

    const inferenceStart = await plugins.inference.start();

    let connectorId = lastUsedConnectorId;
    if (!connectorId) {
      const defaultConnector = await inferenceStart.getDefaultConnector(resources.request);
      connectorId = defaultConnector?.connectorId;
    }

    const inferenceClient = inferenceStart.getClient({ request: resources.request });
    const { context, summary } = await getLogAiInsights({
      fields,
      inferenceClient,
      connectorId,
    });

    return { context, summary };
  },
});

export const observabilityAgentBuilderRouteRepository = {
  ...observabilityAgentBuilderAiInsightsRoute,
};
