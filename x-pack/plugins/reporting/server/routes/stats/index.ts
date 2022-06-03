/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ReportingCore } from '../..';
import { API_STATS_URL } from '../../../common/constants';

export const registerStatsRoutes = (reporting: ReportingCore) => {
  const { router } = reporting.getPluginSetupDeps();
  const stats = reporting.getStats();

  router.get(
    {
      // internal API: starts with /internal/{pluginname}/{...}.
      path: API_STATS_URL,
      options: { authRequired: true, tags: ['api'] },
      validate: {
        params: schema.maybe(schema.any()),
        query: schema.maybe(schema.any()),
      },
    },
    (_context, _request, response) => {
      return response.ok({
        body: stats.toApiJSON(),
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
