/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { INTERNAL_TEST_ROUTE } from '../../common/constants';

export const registerTestRoute = (router: IRouter) => {
  router.get(
    {
      path: INTERNAL_TEST_ROUTE,
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client
      const savedObjectClient = context.core.savedObjects.client;
      return response.ok({
        body: {
          value: 'get value!',
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  );

  router.put(
    {
      path: INTERNAL_TEST_ROUTE,
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client
      const savedObjectClient = context.core.savedObjects.client;
      return response.ok({
        body: {
          value: 'put value!',
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  );
};
