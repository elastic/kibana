/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { observabilityAlertDetailsContextRt } from '../../services';

const getObservabilityAlertDetailsContextRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/assistant/get_obs_alert_details_context',
  options: {
    tags: [],
  },
  params: t.type({
    query: observabilityAlertDetailsContextRt,
  }),
  handler: async ({ request, context, dependencies, params }): Promise<{ context: string }> => {
    const alertDetailsContext =
      await dependencies.alertDetailsContextService.getAlertDetailsContext(context, params.query);
    return { context: alertDetailsContext };
  },
});

export const assistantRouteRepository = getObservabilityAlertDetailsContextRoute;
