/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { reportServerError } from '../../../../../src/plugins/kibana_utils/server';
import { DataEnhancedPluginRouter } from '../type';

export function registerSessionRoutes(router: DataEnhancedPluginRouter, logger: Logger): void {
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
        const response = await context.search!.saveSession(sessionId, {
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
        logger.error(err);
        return reportServerError(res, err);
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
        const response = await context.search!.getSession(id);

        return res.ok({
          body: response,
        });
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
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
        const response = await context.search!.findSessions({
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
        logger.error(err);
        return reportServerError(res, err);
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
        await context.search!.cancelSession(id);

        return res.ok();
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
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
        const response = await context.search!.updateSession(id, { name, expires });

        return res.ok({
          body: response,
        });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.post(
    {
      path: '/internal/session/{id}/_extend',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          expires: schema.string(),
        }),
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { expires } = request.body;
      try {
        const response = await context.search!.extendSession(id, new Date(expires));

        return res.ok({
          body: response,
        });
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );
}
