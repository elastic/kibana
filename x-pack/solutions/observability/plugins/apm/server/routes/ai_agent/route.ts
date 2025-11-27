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
import { getErrorContextData } from './contextual_insights/get_error_context_data';
import { getErrorContextualInsights } from './contextual_insights/get_error_contextual_insights';
import { parseDatemath } from '../../ai_agent/utils/time';

const errorContextRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/ai_agent/contextual_insights/error',
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
  handler: async (
    resources
  ): Promise<{ errorData: any; llmResponse: { content: string } | null }> => {
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

    const startMs = parseDatemath(start);
    const endMs = parseDatemath(end);

    const { errorData } = await getErrorContextData({
      apmEventClient,
      serviceName,
      errorId,
      start: startMs,
      end: endMs,
      environment,
      kuery,
    });

    if (!plugins.inference) {
      throw new Error('Unable to generate contextual insights');
    }

    const inferenceStart = await plugins.inference.start();

    let connectorId = lastUsedConnectorId;
    if (!connectorId) {
      const defaultConnector = await inferenceStart.getDefaultConnector(resources.request);
      connectorId = defaultConnector?.id;
    }

    const inferenceClient = inferenceStart.getClient({ request: resources.request });
    const llmResponse = await getErrorContextualInsights({
      errorData,
      inferenceClient,
      connectorId,
    });

    return { errorData, llmResponse };
  },
});

export const aiAgentRouteRepository = {
  ...errorContextRoute,
};
