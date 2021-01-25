/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { Logger, SavedObject } from 'src/core/server';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { reportServerError } from '../../../../../src/plugins/kibana_utils/server';
import { DataEnhancedPluginRouter } from '../type';
import { ConfigSchema } from '../../config';
import { SearchSessionSavedObjectAttributes } from '../../common';

export function registerSessionRoutes(
  router: DataEnhancedPluginRouter,
  logger: Logger,
  config$: Observable<ConfigSchema>
): void {
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
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const config = await config$.pipe(first()).toPromise();
        const searchSession = (await context.search.getSession(
          id
        )) as SavedObject<SearchSessionSavedObjectAttributes>;
        const expires = moment(searchSession.attributes.expires).add(
          config.search.sessions.defaultExpiration
        );
        const ttl = `${expires.diff(moment())}ms`;
        const response = await context.search!.extendSession(id, ttl);

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
