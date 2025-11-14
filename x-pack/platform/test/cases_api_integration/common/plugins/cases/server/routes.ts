/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createHash } from 'crypto';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ExternalReferenceAttachmentType,
  PersistableStateAttachmentTypeSetup,
} from '@kbn/cases-plugin/server/attachment_framework/types';
import type { BulkCreateCasesRequest, CasesPatchRequest } from '@kbn/cases-plugin/common/types/api';
import { ActionExecutionSourceType } from '@kbn/actions-plugin/server/types';
import {
  ANALYTICS_BACKFILL_TASK_TYPE,
  CASES_TELEMETRY_TASK_NAME,
} from '@kbn/cases-plugin/common/constants';
import { CAI_SCHEDULER_TASK_ID } from '@kbn/cases-plugin/server/cases_analytics/tasks/scheduler_task/constants';
import type { FixtureStartDeps } from './plugin';

const hashParts = (parts: string[]): string => {
  const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
  const hashFeed = parts.join('-');
  return hash.update(hashFeed).digest('hex');
};

const getExternalReferenceAttachmentTypeHash = (type: ExternalReferenceAttachmentType) => {
  return hashParts([type.id]);
};

const getPersistableStateAttachmentTypeHash = (type: PersistableStateAttachmentTypeSetup) => {
  return hashParts([type.id]);
};

export const registerRoutes = (core: CoreSetup<FixtureStartDeps>, logger: Logger) => {
  const router = core.http.createRouter();
  /**
   * This simply wraps the cases patch case api so that we can test updating the status of an alert using
   * the cases client interface instead of going through the case plugin's RESTful interface
   */
  router.patch(
    {
      path: '/api/cases_user/cases',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const client = await cases.getCasesClientWithRequest(request);

        return response.ok({
          body: await client.cases.bulkUpdate(request.body as CasesPatchRequest),
        });
      } catch (error) {
        logger.error(`CasesClientUser failure: ${error}`);
        throw error;
      }
    }
  );

  router.get(
    {
      path: '/api/cases_fixture/registered_external_reference_attachments',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const externalReferenceAttachmentTypeRegistry =
          cases.getExternalReferenceAttachmentTypeRegistry();

        const allTypes = externalReferenceAttachmentTypeRegistry.list();

        const hashMap = allTypes.reduce((map, type) => {
          map[type.id] = getExternalReferenceAttachmentTypeHash(type);
          return map;
        }, {} as Record<string, string>);

        return response.ok({
          body: hashMap,
        });
      } catch (error) {
        logger.error(`Error : ${error}`);
        throw error;
      }
    }
  );

  router.get(
    {
      path: '/api/cases_fixture/registered_persistable_state_attachments',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const persistableStateAttachmentTypeRegistry =
          cases.getPersistableStateAttachmentTypeRegistry();

        const allTypes = persistableStateAttachmentTypeRegistry.list();

        const hashMap = allTypes.reduce((map, type) => {
          map[type.id] = getPersistableStateAttachmentTypeHash(type);
          return map;
        }, {} as Record<string, string>);

        return response.ok({
          body: hashMap,
        });
      } catch (error) {
        logger.error(`Error : ${error}`);
        throw error;
      }
    }
  );

  /**
   * This is a fake route to handle deprecated getAllComments method which returns all comments
   * where as findComments returns only comments of type 'user'
   * we should improve findComments method to return all comments https://github.com/elastic/kibana/issues/208188
   */
  router.get(
    {
      path: '/api/cases_fixture/cases/{id}/comments',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const client = await cases.getCasesClientWithRequest(request);

        return response.ok({
          body: await client.attachments.getAll({ caseID: request.params.id }),
        });
      } catch (error) {
        if (error.isBoom && error.output.statusCode === 403) {
          return response.forbidden({ body: error });
        }

        logger.error(`Error : ${error}`);
        throw error;
      }
    }
  );

  router.post(
    {
      path: '/api/cases_fixture/cases:bulkCreate',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const client = await cases.getCasesClientWithRequest(request);

        return response.ok({
          body: await client.cases.bulkCreate(request.body as BulkCreateCasesRequest),
        });
      } catch (error) {
        logger.error(`Error : ${error}`);

        const boom = new Boom.Boom(error.message, {
          statusCode: error.wrappedError.output.statusCode,
        });

        return response.customError({
          body: boom,
          headers: boom.output.headers as { [key: string]: string },
          statusCode: boom.output.statusCode,
        });
      }
    }
  );

  router.post(
    {
      path: '/api/cases_fixture/{id}/connectors:execute',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (context, req, res) => {
      const [_, { actions }] = await core.getStartServices();

      const actionsClient = await actions.getActionsClientWithRequest(req);

      try {
        return res.ok({
          body: await actionsClient.execute({
            actionId: req.params.id,
            params: req.body.params,
            source: {
              type: ActionExecutionSourceType.HTTP_REQUEST,
              source: req,
            },
            relatedSavedObjects: [],
          }),
        });
      } catch (err) {
        if (err.isBoom && err.output.statusCode === 403) {
          return res.forbidden({ body: err });
        }

        throw err;
      }
    }
  );

  router.post(
    {
      path: '/api/cases_fixture/telemetry/run_soon',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string({
            validate: (telemetryTaskId: string) => {
              if (CASES_TELEMETRY_TASK_NAME === telemetryTaskId) {
                return;
              }

              return 'invalid telemetry task id';
            },
          }),
        }),
      },
    },
    async (context, req, res) => {
      const { taskId } = req.body;
      try {
        const [_, { taskManager }] = await core.getStartServices();
        return res.ok({ body: await taskManager.runSoon(taskId) });
      } catch (err) {
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: '/api/analytics_index/scheduler/run_soon',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {},
    },
    async (context, req, res) => {
      try {
        const [_, { taskManager }] = await core.getStartServices();
        logger.info(`Request to run scheduler task id: ${CAI_SCHEDULER_TASK_ID}`);
        return res.ok({
          body: await taskManager.runSoon(CAI_SCHEDULER_TASK_ID),
        });
      } catch (err) {
        logger.error(`Error : ${err}`);
        return res.ok({ body: { id: CAI_SCHEDULER_TASK_ID, error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: '/api/analytics_index/backfill/run_soon',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string(),
          sourceIndex: schema.string(),
          destIndex: schema.string(),
          sourceQuery: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const { taskId, sourceIndex, destIndex, sourceQuery } = req.body;
      try {
        const [_, { taskManager }] = await core.getStartServices();

        return res.ok({
          body: await taskManager.ensureScheduled({
            id: taskId,
            taskType: ANALYTICS_BACKFILL_TASK_TYPE,
            params: { sourceIndex, destIndex, sourceQuery: JSON.parse(sourceQuery) },
            runAt: new Date(),
            state: {},
          }),
        });
      } catch (err) {
        logger.error(`Error : ${err}`);
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: '/api/analytics_index/synchronization/run_soon',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const { taskId } = req.body;
      try {
        const [_, { taskManager }] = await core.getStartServices();
        return res.ok({ body: await taskManager.runSoon(taskId) });
      } catch (err) {
        logger.error(`Error : ${err}`);
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );
};
