/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { alertDetailsContextRt } from '../../services';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const getObservabilityAlertDetailsContextRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: t.type({
    query: alertDetailsContextRt,
  }),
  handler: async ({ dependencies, params, context, request }) => {
    const alertContext =
      await dependencies.assistant.alertDetailsContextualInsightsService.getAlertDetailsContext(
        {
          core: context.core,
          licensing: context.licensing,
          request,
        },
        params.query
      );

    return { alertContext };
  },
});

export const aiAssistantRouteRepository = {
  ...getObservabilityAlertDetailsContextRoute,
};
