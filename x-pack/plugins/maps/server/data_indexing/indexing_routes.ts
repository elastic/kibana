/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  INDEX_SOURCE_API_PATH,
  MAX_DRAWING_SIZE_BYTES,
  GET_MATCHING_INDEXES_PATH,
  INDEX_FEATURE_PATH,
  CHECK_IS_DRAWING_INDEX,
  MAPS_NEW_VECTOR_LAYER_META_CREATED_BY,
} from '../../common/constants';
import { createDocSource } from './create_doc_source';
import { writeDataToIndex } from './index_data';
import { getMatchingIndexes } from './get_indexes_matching_pattern';

export function initIndexingRoutes({
  router,
  logger,
  getDataPlugin,
}: {
  router: IRouter<DataRequestHandlerContext>;
  logger: Logger;
  getDataPlugin: () => Promise<DataPluginStart>;
  securityPlugin?: SecurityPluginStart;
}) {
  router.versioned
    .post({
      path: INDEX_SOURCE_API_PATH,
      access: 'internal',
      options: {
        body: {
          accepts: ['application/json'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              index: schema.string(),
              mappings: schema.any(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const { index, mappings } = request.body;
        const dataPlugin = await getDataPlugin();
        const indexPatternsService = await dataPlugin.indexPatterns.dataViewsServiceFactory(
          coreContext.savedObjects.client,
          coreContext.elasticsearch.client.asCurrentUser,
          request
        );
        const result = await createDocSource(
          index,
          mappings,
          coreContext.elasticsearch.client,
          indexPatternsService
        );
        if (result.success) {
          return response.ok({ body: result });
        } else {
          if (result.error) {
            logger.error(result.error);
          }
          return response.custom({
            body: result?.error?.message,
            statusCode: 500,
          });
        }
      }
    );

  router.versioned
    .post({
      path: INDEX_FEATURE_PATH,
      access: 'internal',
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_DRAWING_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              index: schema.string(),
              data: schema.any(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const result = await writeDataToIndex(
          request.body.index,
          request.body.data,
          coreContext.elasticsearch.client.asCurrentUser
        );
        if (result.success) {
          return response.ok({ body: result });
        } else {
          logger.error(result.error);
          return response.custom({
            body: result.error.message,
            statusCode: 500,
          });
        }
      }
    );

  router.versioned
    .delete({
      path: `${INDEX_FEATURE_PATH}/{featureId}`,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              featureId: schema.string(),
            }),
            body: schema.object({
              index: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const resp = await coreContext.elasticsearch.client.asCurrentUser.delete({
            index: request.body.index,
            id: request.params.featureId,
            refresh: 'wait_for',
          });
          // @ts-expect-error always false
          if (resp.result === 'Error') {
            throw resp;
          } else {
            return response.ok({ body: { success: true } });
          }
        } catch (error) {
          logger.error(error);
          const errorStatusCode = error.meta?.statusCode;
          if (errorStatusCode === 401) {
            return response.unauthorized({
              body: {
                message: 'User not authorized to delete indexed feature',
              },
            });
          } else if (errorStatusCode === 403) {
            return response.forbidden({
              body: {
                message: 'Access to delete indexed feature forbidden',
              },
            });
          } else if (errorStatusCode === 404) {
            return response.notFound({
              body: { message: 'Feature not found' },
            });
          } else {
            return response.custom({
              body: 'Unknown error deleting feature',
              statusCode: 500,
            });
          }
        }
      }
    );

  router.versioned
    .get({
      path: GET_MATCHING_INDEXES_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              indexPattern: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        return await getMatchingIndexes(
          request.query.indexPattern,
          coreContext.elasticsearch.client,
          response,
          logger
        );
      }
    );

  router.versioned
    .get({
      path: CHECK_IS_DRAWING_INDEX,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              index: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { index } = request.query;
        try {
          const coreContext = await context.core;
          const mappingsResp =
            await coreContext.elasticsearch.client.asCurrentUser.indices.getMapping({
              index: request.query.index,
            });
          const isDrawingIndex =
            mappingsResp[index].mappings?._meta?.created_by ===
            MAPS_NEW_VECTOR_LAYER_META_CREATED_BY;
          return response.ok({
            body: {
              success: true,
              isDrawingIndex,
            },
          });
        } catch (error) {
          // Index likely doesn't exist
          return response.ok({
            body: {
              success: false,
              error,
            },
          });
        }
      }
    );
}
