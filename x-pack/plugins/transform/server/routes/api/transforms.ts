/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import {
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from 'kibana/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { wrapEsError } from '../../../../../legacy/server/lib/create_router/error_wrappers';

import {
  TransformEndpointRequest,
  TransformEndpointResult,
  TransformId,
  TRANSFORM_STATE,
  DeleteTransformEndpoint,
  DeleteTransformStatus,
  DeleteTransformEndpointResult,
  ResultData,
} from '../../../common';

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { isRequestTimeout, fillResultsWithTimeouts, wrapError } from './error_utils';
import { schemaTransformId, SchemaTransformId } from './schema';
import { registerTransformsAuditMessagesRoutes } from './transforms_audit_messages';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';

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

export async function canDeleteIndex(
  indexName: string,
  callAsCurrentUser: CallCluster,
  license: RouteDependencies['license']
): Promise<boolean> {
  if (!license.getStatus().isSecurityEnabled) {
    // If security isn't enabled, let the user use app.
    return true;
  }

  const { has_all_requested: hasAllPrivileges } = await callAsCurrentUser('transport.request', {
    path: '/_security/user/_has_privileges',
    method: 'POST',
    body: {
      index: [
        {
          names: [indexName],
          privileges: ['delete_index'],
        },
      ],
    },
  });
  return hasAllPrivileges;
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
        .catch((e) =>
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
      path: addBasePath('transforms/{transformId}/_update'),
      validate: {
        ...schemaTransformId,
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { transformId } = req.params as SchemaTransformId;

      try {
        return res.ok({
          body: await ctx.transform!.dataClient.callAsCurrentUser('transform.updateTransform', {
            body: req.body,
            transformId,
          }),
        });
      } catch (e) {
        return res.customError(wrapError(e));
      }
    })
  );
  router.post(
    {
      path: addBasePath('delete_transforms'),
      validate: {
        body: schema.maybe(schema.any()),
        query: schema.object({
          /**
           * Analytics Destination Index
           */
          deleteDestIndex: schema.maybe(schema.boolean()),
          deleteDestIndexPattern: schema.maybe(schema.boolean()),
        }),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const {
        transformsInfo,
        deleteDestIndex,
        deleteDestIndexPattern,
      } = req.body as DeleteTransformEndpoint;

      try {
        if (deleteDestIndex || deleteDestIndexPattern) {
          return res.ok({
            body: await deleteTransformsWithDestIndex(
              transformsInfo,
              deleteDestIndex,
              deleteDestIndexPattern,
              ctx,
              license,
              res
            ),
          });
        } else {
          return res.ok({
            body: await deleteTransforms(
              transformsInfo,
              ctx.transform!.dataClient.callAsCurrentUser
            ),
          });
        }
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
  const results: DeleteTransformEndpointResult = {};

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
      results[transformId] = { transformJobDeleted: { success: true } };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.DELETE,
        });
      }
      results[transformId] = { transformJobDeleted: { success: false, error: JSON.stringify(e) } };
    }
  }
  return results;
}

async function getIndexPatternId(
  indexName: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  const response = await savedObjectsClient.find<IIndexPattern>({
    type: 'index-pattern',
    perPage: 10,
    search: `"${indexName}"`,
    searchFields: ['title'],
    fields: ['title'],
  });

  const ip = response.saved_objects.find(
    (obj) => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
  );

  return ip?.id;
}

async function deleteDestIndexPatternById(
  indexPatternId: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  return await savedObjectsClient.delete('index-pattern', indexPatternId);
}

async function deleteTransformsWithDestIndex(
  transformsInfo: TransformEndpointRequest[],
  deleteDestIndex: boolean | undefined,
  deleteDestIndexPattern: boolean | undefined,
  ctx: RequestHandlerContext,
  license: RouteDependencies['license'],
  response: KibanaResponseFactory
) {
  const tempResults: TransformEndpointResult = {};
  const results: Record<string, DeleteTransformStatus> = {};

  for (const transformInfo of transformsInfo) {
    let destinationIndex: string | undefined;
    const transformJobDeleted: ResultData = { success: false };
    const destIndexDeleted: ResultData = { success: false };
    const destIndexPatternDeleted: ResultData = {
      success: false,
    };
    const transformId = transformInfo.id;
    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        try {
          await ctx.transform!.dataClient.callAsCurrentUser('transform.stopTransform', {
            transformId,
            force: true,
            waitForCompletion: true,
          } as StopOptions);
        } catch (e) {
          if (isRequestTimeout(e)) {
            return fillResultsWithTimeouts({
              results: tempResults,
              id: transformId,
              items: transformsInfo,
              action: TRANSFORM_ACTIONS.DELETE,
            });
          }
        }
      }
      // Grab destination index info to delete
      try {
        const transformConfigs = await getTransforms(
          { transformId },
          ctx.transform!.dataClient.callAsCurrentUser
        );
        const transformConfig = transformConfigs.transforms[0];
        destinationIndex = Array.isArray(transformConfig.dest.index)
          ? transformConfig.dest.index[0]
          : transformConfig.dest.index;
      } catch (getTransformConfigError) {
        return response.customError(wrapError(getTransformConfigError));
      }

      // If user checks box to delete the destinationIndex associated with the job
      if (destinationIndex && deleteDestIndex) {
        // Verify if user has privilege to delete the destination index
        const userCanDeleteDestIndex = await canDeleteIndex(
          destinationIndex,
          ctx.transform!.dataClient.callAsCurrentUser,
          license
        );
        // If user does have privilege to delete the index, then delete the index
        if (userCanDeleteDestIndex) {
          try {
            await ctx.transform!.dataClient.callAsCurrentUser('indices.delete', {
              index: destinationIndex,
            });
            destIndexDeleted.success = true;
          } catch (deleteIndexError) {
            destIndexDeleted.error = wrapError(deleteIndexError);
          }
        } else {
          return response.forbidden();
        }
      }

      // Delete the index pattern if there's an index pattern that matches the name of dest index
      if (destinationIndex && deleteDestIndexPattern) {
        try {
          const indexPatternId = await getIndexPatternId(
            destinationIndex,
            ctx.core.savedObjects.client
          );
          if (indexPatternId) {
            await deleteDestIndexPatternById(indexPatternId, ctx.core.savedObjects.client);
          }
          destIndexPatternDeleted.success = true;
        } catch (deleteDestIndexPatternError) {
          destIndexPatternDeleted.error = wrapError(deleteDestIndexPatternError);
        }
      }

      try {
        await ctx.transform!.dataClient.callAsCurrentUser('transform.deleteTransform', {
          transformId,
        });
        transformJobDeleted.success = true;
      } catch (deleteTransformJobError) {
        transformJobDeleted.error = wrapError(deleteTransformJobError);
        if (transformJobDeleted.error.statusCode === 404) {
          return response.notFound();
        }
      }

      results[transformId] = {
        transformJobDeleted,
        destIndexDeleted,
        destIndexPatternDeleted,
        destinationIndex,
      };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.DELETE,
        });
      }
      results[transformId] = { transformJobDeleted: { success: false, error: JSON.stringify(e) } };
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
  const transformsInfo = req.body as TransformEndpointRequest[];

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
  const transformsInfo = req.body as TransformEndpointRequest[];

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
