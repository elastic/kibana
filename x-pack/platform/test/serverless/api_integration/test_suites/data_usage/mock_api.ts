/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from '@mswjs/http-middleware';
import type { UsageMetricsAutoOpsResponseSchemaBody } from '@kbn/data-usage-plugin/server/services/autoops_api';
import type { StrictResponse } from 'msw';
import { http, HttpResponse } from 'msw';
import { mockAutoOpsResponse } from './mock_data';

export const setupMockServer = () => {
  const server = createServer(autoOpsHandler);
  return server;
};

const autoOpsHandler = http.post(
  '/monitoring/serverless/v1/projects/fakeprojectid/metrics',
  async ({ request }): Promise<StrictResponse<UsageMetricsAutoOpsResponseSchemaBody>> => {
    return HttpResponse.json(mockAutoOpsResponse);
  }
);
