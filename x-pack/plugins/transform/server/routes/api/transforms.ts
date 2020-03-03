/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RequestHandler } from 'kibana/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { wrapEsError } from '../../../../../legacy/server/lib/create_router/error_wrappers';

import { TRANSFORM_STATE } from '../../../../../legacy/plugins/transform/public/app/common';
import {
  TransformEndpointRequest,
  TransformEndpointResult,
} from '../../../../../legacy/plugins/transform/public/app/hooks/use_api_types';
import { TransformId } from '../../../../../legacy/plugins/transform/public/app/common/transform';

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { isRequestTimeout, fillResultsWithTimeouts, wrapError } from './error_utils';
import { schemaTransformId, SchemaTransformId } from './schema';
import { registerTransformsAuditMessagesRoutes } from './transforms_audit_messages';

enum TRANSFORM_ACTIONS {
  STOP = 'stop',
  START = 'start',
  DELETE = 'delete',
}

interface StopOptions {
  transformId: TransformId;
  force: boolean;
  waitForCompletion?: boolean;
}

export function registerTransformsRoutes(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;
  router.get(
    { path: addBasePath('transforms'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const options = {};
      try {
        const transforms = await getTransforms(
          options,
          ctx.transform!.dataClient.callAsCurrentUser
        );
        return res.ok({ body: transforms });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  router.get(
    {
      path: addBasePath('transforms/{transformId}'),
      validate: schemaTransformId,
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { transformId } = req.params as SchemaTransformId;
      const options = {
        ...(transformId !== undefined ? { transformId } : {}),
      };
      try {
        const transforms = await getTransforms(
          options,
          ctx.transform!.dataClient.callAsCurrentUser
        );
        return res.ok({ body: transforms });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  router.get(
    { path: addBasePath('transforms/_stats'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const options = {};
      try {
        const stats = await ctx.transform!.dataClient.callAsCurrentUser(
          'transform.getTransformsStats',
          options
        );
        return res.ok({ body: stats });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  router.get(
    {
      path: addBasePath('transforms/{transformId}/_stats'),
      validate: schemaTransformId,
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { transformId } = req.params as SchemaTransformId;
      const options = {
        ...(transformId !== undefined ? { transformId } : {}),
      };
      try {
        const stats = await ctx.transform!.dataClient.callAsCurrentUser(
          'transform.getTransformsStats',
          options
        );
        return res.ok({ body: stats });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  registerTransformsAuditMessagesRoutes(routeDependencies);
  router.put(
    {
      path: addBasePath('transforms/{transformId}'),
      validate: {
        ...schemaTransformId,
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { transformId } = req.params as SchemaTransformId;

      const response: {
        transformsCreated: Array<{ transform: string }>;
        errors: any[];
      } = {
        transformsCreated: [],
        errors: [],
      };

      await ctx
        .transform!.dataClient.callAsCurrentUser('transform.createTransform', {
          body: req.body,
          transformId,
        })
        .then(() => response.transformsCreated.push({ transform: transformId }))
        .catch(e =>
          response.errors.push({
            id: transformId,
            error: wrapEsError(e),
          })
        );

      return res.ok({ body: response });
    })
  );
  router.post(
    {
      path: addBasePath('delete_transforms'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const transformsInfo = req.body as TransformEndpointRequest[];

      try {
        return res.ok({
          body: await deleteTransforms(transformsInfo, ctx.transform!.dataClient.callAsCurrentUser),
        });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  router.post(
    {
      path: addBasePath('transforms/_preview'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(previewTransformHandler)
  );
  router.post(
    {
      path: addBasePath('start_transforms'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(startTransformsHandler)
  );
  router.post(
    {
      path: addBasePath('stop_transforms'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(stopTransformsHandler)
  );
  router.post(
    {
      path: addBasePath('es_search'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      try {
        return res.ok({
          body: await ctx.transform!.dataClient.callAsCurrentUser('search', req.body),
        });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}

const getTransforms = async (options: { transformId?: string }, callAsCurrentUser: CallCluster) => {
  return await callAsCurrentUser('transform.getTransforms', options);
};

async function deleteTransforms(
  transformsInfo: TransformEndpointRequest[],
  callAsCurrentUser: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        try {
          await callAsCurrentUser('transform.stopTransform', {
            transformId,
            force: true,
            waitForCompletion: true,
          } as StopOptions);
        } catch (e) {
          if (isRequestTimeout(e)) {
            return fillResultsWithTimeouts({
              results,
              id: transformId,
              items: transformsInfo,
              action: TRANSFORM_ACTIONS.DELETE,
            });
          }
        }
      }

      await callAsCurrentUser('transform.deleteTransform', { transformId });
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.DELETE,
        });
      }
      results[transformId] = { success: false, error: JSON.stringify(e) };
    }
  }
  return results;
}

const previewTransformHandler: RequestHandler = async (ctx, req, res) => {
  try {
    return res.ok({
      body: await ctx.transform!.dataClient.callAsCurrentUser('transform.getTransformsPreview', {
        body: req.body,
      }),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

const startTransformsHandler: RequestHandler = async (ctx, req, res) => {
  const { transformsInfo } = req.body as {
    transformsInfo: TransformEndpointRequest[];
  };

  try {
    return res.ok({
      body: await startTransforms(transformsInfo, ctx.transform!.dataClient.callAsCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function startTransforms(
  transformsInfo: TransformEndpointRequest[],
  callAsCurrentUser: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callAsCurrentUser('transform.startTransform', { transformId } as SchemaTransformId);
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.START,
        });
      }
      results[transformId] = { success: false, error: JSON.stringify(e) };
    }
  }
  return results;
}

const stopTransformsHandler: RequestHandler = async (ctx, req, res) => {
  const { transformsInfo } = req.body as {
    transformsInfo: TransformEndpointRequest[];
  };

  try {
    return res.ok({
      body: await stopTransforms(transformsInfo, ctx.transform!.dataClient.callAsCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function stopTransforms(
  transformsInfo: TransformEndpointRequest[],
  callAsCurrentUser: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callAsCurrentUser('transform.stopTransform', {
        transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
        waitForCompletion: true,
      } as StopOptions);
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.STOP,
        });
      }
      results[transformId] = { success: false, error: JSON.stringify(e) };
    }
  }
  return results;
}
