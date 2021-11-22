/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import uuid from 'uuid';
import { IRouter } from '../../../../../src/core/server';
import { INTERNAL_TEST_ROUTE } from '../../common/constants';

export const registerTestRoute = (router: IRouter) => {
  router.get(
    {
      path: INTERNAL_TEST_ROUTE,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client
      const client = context.core.elasticsearch.client.asCurrentUser;

      const { index } = request.query;

      const search = await client.search({
        index: [`${index}`],
      });

      return response.ok({ body: search.body.hits });
    }
  );

  router.put(
    {
      path: INTERNAL_TEST_ROUTE,
      validate: {
        body: schema.object({
          index: schema.string(),
          data: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      // TODO (Jiawei & Paulo): Evaluate saved objects & ES client
      const { index, data } = request.body;

      const client = context.core.elasticsearch.client.asCurrentUser;

      const requests = JSON.parse(data).map((obj: any) => {
        return client.create({
          index,
          id: uuid(),
          body: {
            ...obj,
            timestamp: new Date().toISOString(),
          },
        });
      });

      await Promise.all(requests);

      return response.ok({
        body: {
          message: 'ok!',
        },
      });
    }
  );

  router.delete(
    {
      path: INTERNAL_TEST_ROUTE,
      validate: {
        body: schema.object({
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { index } = request.body;
      const client = context.core.elasticsearch.client.asCurrentUser;

      await client.deleteByQuery({
        index,
        body: {
          query: { match_all: {} },
        },
      });

      return response.ok({
        body: {
          message: 'ok!',
        },
      });
    }
  );
};
