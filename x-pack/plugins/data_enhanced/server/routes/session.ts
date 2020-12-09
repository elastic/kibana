/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export function registerSessionRoutes(router: IRouter): void {
  router.post(
    {
      path: '/internal/session',
      validate: {
        body: schema.object({
          sessionId: schema.string(),
          name: schema.string(),
          appId: schema.string(),
          expires: schema.maybe(schema.string()),
          urlGeneratorId: schema.string(),
          initialState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          restoreState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        }),
      },
    },
    async (context, request, res) => {
      const {
        sessionId,
        name,
        expires,
        initialState,
        restoreState,
        appId,
        urlGeneratorId,
      } = request.body;

      try {
        const response = await context.search!.session.save(sessionId, {
          name,
          appId,
          expires,
          urlGeneratorId,
          initialState,
          restoreState,
        });

        return res.ok({
          body: response,
        });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const response = await context.search!.session.get(id);

        return res.ok({
          body: response,
        });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/internal/session/_find',
      validate: {
        body: schema.object({
          page: schema.maybe(schema.number()),
          perPage: schema.maybe(schema.number()),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.string()),
          filter: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, res) => {
      const { page, perPage, sortField, sortOrder, filter } = request.body;
      try {
        const response = await context.search!.session.find({
          page,
          perPage,
          sortField,
          sortOrder,
          filter,
        });

        return res.ok({
          body: response,
        });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );

  router.delete(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        await context.search!.session.delete(id);

        return res.ok();
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );

  router.put(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          name: schema.maybe(schema.string()),
          expires: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { name, expires } = request.body;
      try {
        const response = await context.search!.session.update(id, { name, expires });

        return res.ok({
          body: response,
        });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );
}
