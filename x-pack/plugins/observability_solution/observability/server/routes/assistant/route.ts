/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import {
  AlertDetailsContextualInsight,
  AlertDetailsContextualInsightsRequestContext,
  observabilityAlertDetailsContextRt,
} from '../../services';

const getObservabilityAlertDetailsContextRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
  options: {
    tags: [],
  },
  params: t.type({
    query: observabilityAlertDetailsContextRt,
  }),
  handler: async ({
    request,
    context,
    dependencies,
    params,
  }): Promise<AlertDetailsContextualInsight[]> => {
    const requestContext = {
      ...context,
      request,
    } as AlertDetailsContextualInsightsRequestContext;

    const alertDetailsContext =
      await dependencies.assistant.alertDetailsContextualInsightsService.getAlertDetailsContext(
        requestContext,
        params.query
      );
    return alertDetailsContext;
  },
});

export const assistantRouteRepository = getObservabilityAlertDetailsContextRoute;
