/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import uuid from 'uuid';
import { IRouter } from '../../../../../src/core/server';
import { INTERNAL_TEST_SAVED_OBJECT_ROUTE, TEST_SAVED_OBJECT } from '../../common/constants';

export const registerTestSavedObjectsRoute = (router: IRouter) => {
  router.get(
    {
      path: INTERNAL_TEST_SAVED_OBJECT_ROUTE,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, _, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client
      const client = context.core.savedObjects.client;

      const search = await client.find({
        type: TEST_SAVED_OBJECT,
      });

      return response.ok({ body: search.saved_objects });
    }
  );

  router.put(
    {
      path: INTERNAL_TEST_SAVED_OBJECT_ROUTE,
      validate: {
        body: schema.object({
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client

      const client = context.core.savedObjects.client;

      client.create(
        TEST_SAVED_OBJECT,
        {
          name: 'Test Message',
          value: new Date().toISOString(),
        },
        {
          overwrite: true,
        }
      );

      return response.ok({
        body: {
          message: 'success',
        },
      });
    }
  );
};
