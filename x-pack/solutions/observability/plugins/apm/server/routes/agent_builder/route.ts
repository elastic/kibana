/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getErrorAiInsights } from './ai_insights/explain_error/get_error_ai_insights';

const observabilityAgentBuilderAiInsightsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/agent_builder/ai_insights/error',
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
      serviceName: t.string,
      errorId: t.string,
      start: t.string,
      end: t.string,
      environment: t.union([t.string, t.undefined]),
      kuery: t.union([t.string, t.undefined]),
      connectorId: t.union([t.string, t.undefined]),
    }),
  }),
  handler: async (resources): Promise<{ context: string; summary: string }> => {
    const { params, plugins } = resources;

    const {
      serviceName,
      errorId,
      start,
      end,
      environment = '',
      kuery = '',
      connectorId: lastUsedConnectorId,
    } = params.body;

    const apmEventClient = await getApmEventClient(resources);

    if (!plugins.inference) {
      throw new Error('Unable to generate contextual insights');
    }

    const inferenceStart = await plugins.inference.start();

    let connectorId = lastUsedConnectorId;
    if (!connectorId) {
      const defaultConnector = await inferenceStart.getDefaultConnector(resources.request);
      connectorId = defaultConnector?.connectorId;
    }

    const inferenceClient = inferenceStart.getClient({ request: resources.request });
    const { context, summary } = await getErrorAiInsights({
      apmEventClient,
      serviceName,
      errorId,
      start,
      end,
      environment,
      kuery,
      inferenceClient,
      connectorId,
    });

    return { context, summary };
  },
});

export const observabilityAgentBuilderRouteRepository = {
  ...observabilityAgentBuilderAiInsightsRoute,
};
