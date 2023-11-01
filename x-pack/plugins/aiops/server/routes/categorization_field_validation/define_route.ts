/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { categorizationFieldValidationSchema } from '../../../common/api/log_categorization/schema';
import { AIOPS_API_ENDPOINT } from '../../../common/api';
import type { AiopsLicense } from '../../types';
import { routeHandlerFactory } from './route_handler_factory';

export const defineRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  usageCounter?: UsageCounter
) => {
  router.versioned
    .post({
      path: AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: categorizationFieldValidationSchema,
          },
        },
      },
      routeHandlerFactory(license, usageCounter)
    );
};
