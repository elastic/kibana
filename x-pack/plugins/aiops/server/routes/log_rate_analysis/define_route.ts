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

import { aiopsLogRateAnalysisSchemaV1 } from '../../../common/api/log_rate_analysis/schema_v1';
import { aiopsLogRateAnalysisSchemaV2 } from '../../../common/api/log_rate_analysis/schema_v2';
import { AIOPS_API_ENDPOINT } from '../../../common/api';

import type { AiopsLicense } from '../../types';

import { routeHandlerFactory } from './route_handler_factory';

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
        version: '1',
        validate: {
          request: {
            body: aiopsLogRateAnalysisSchemaV1,
          },
        },
      },
      routeHandlerFactory('1', license, logger, coreStart, usageCounter)
    )
    .addVersion(
      {
        version: '2',
        validate: {
          request: {
            body: aiopsLogRateAnalysisSchemaV2,
          },
        },
      },
      routeHandlerFactory('2', license, logger, coreStart, usageCounter)
    );
};
