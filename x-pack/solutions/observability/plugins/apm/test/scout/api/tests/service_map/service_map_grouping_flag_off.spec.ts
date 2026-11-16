/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ServiceMapResponse } from '@kbn/apm-types';
import {
  apiTest,
  COMMON_HEADERS,
  getServiceMap,
  SERVICE_MAP_GROUPING_END_DATE,
  SERVICE_MAP_GROUPING_ENVIRONMENT,
  SERVICE_MAP_GROUPING_SERVICES,
  SERVICE_MAP_GROUPING_START_DATE,
} from '../../fixtures';

// Removed together with the service map grouping flag: https://github.com/elastic/kibana/issues/300607
apiTest.describe(
  'Service map grouping with service map grouping disabled',
  // Regular tags, unlike `service_map_grouping.spec.ts`: the flag is off by default, so this test
  // doesn't override it and can run on every target, Cloud included
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('does not group the map, however many services it has', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, {
        headers,
        query: {
          start: SERVICE_MAP_GROUPING_START_DATE,
          end: SERVICE_MAP_GROUPING_END_DATE,
          environment: SERVICE_MAP_GROUPING_ENVIRONMENT,
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as ServiceMapResponse;
      expect(body.servicesData).toHaveLength(SERVICE_MAP_GROUPING_SERVICES.length);
      expect(body.serviceGrouping).toBeUndefined();
    });
  }
);
