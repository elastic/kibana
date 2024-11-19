/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { aiopsLogRateAnalysisSchemaV2 } from '@kbn/aiops-log-rate-analysis/api/schema_v2';
import { aiopsLogRateAnalysisSchemaV3 } from '@kbn/aiops-log-rate-analysis/api/schema_v3';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';

import type { AiopsLicense } from '../../types';

import { routeHandlerFactory } from './route_handler_factory';

/**
 * `defineRoute` is called in the root `plugin.ts` to set up the API route
 * for log rate analysis. Its purpose is to take care of the route setup
 * and versioning only. `routeHandlerFactory` is used to take care of
 * the actual route logic.
 */
export const defineRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
) => {
  router.versioned
    .post({
      path: AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS,
      access: 'internal',
    })
    .addVersion(
      {
        version: '2',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            body: aiopsLogRateAnalysisSchemaV2,
          },
        },
      },
      routeHandlerFactory('2', license, logger, coreStart, usageCounter)
    )
    .addVersion(
      {
        version: '3',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            body: aiopsLogRateAnalysisSchemaV3,
          },
        },
      },
      routeHandlerFactory('3', license, logger, coreStart, usageCounter)
    );
};
