/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { aiopsLogRateAnalysisSchemaV3 } from '@kbn/aiops-log-rate-analysis/api/schema_v3';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';

import type { AiopsLicense } from '../../types';

import { routeHandlerFactory } from './route_handler_factory';

/**
 * `defineRoute` is called in the root `plugin.ts` to set up the API route
 * for field candidates. Its purpose is to take care of the route setup
 * and versioning only. `routeHandlerFactory` is used to take care of
 * the actual route logic.
 */
export const defineRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
) => {
  router.versioned
    .post({
      path: AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: aiopsLogRateAnalysisSchemaV3,
          },
        },
      },
      routeHandlerFactory('1', license, coreStart, usageCounter)
    );
};
