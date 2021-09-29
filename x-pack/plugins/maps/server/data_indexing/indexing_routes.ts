/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { IRouter } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
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
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';
import { getMatchingIndexes } from './get_indexes_matching_pattern';
import { SecurityPluginStart } from '../../../security/server';

export function initIndexingRoutes({
  router,
  logger,
  dataPlugin,
}: {
  router: IRouter<DataRequestHandlerContext>;
  logger: Logger;
  dataPlugin: DataPluginStart;
  securityPlugin?: SecurityPluginStart;
}) {
  router.post(
    {
      path: `/${INDEX_SOURCE_API_PATH}`,
      validate: {
        body: schema.object({
          index: schema.string(),
          mappings: schema.any(),
        }),
      },
      options: {
        body: {
          accepts: ['application/json'],
        },
      },
    },
    async (context, request, response) => {
      const { index, mappings } = request.body;
      const indexPatternsService = await dataPlugin.indexPatterns.indexPatternsServiceFactory(
        context.core.savedObjects.client,
        context.core.elasticsearch.client.asCurrentUser
      );
      const result = await createDocSource(
        index,
        mappings,
        context.core.elasticsearch.client,
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

  router.post(
    {
      path: INDEX_FEATURE_PATH,
      validate: {
        body: schema.object({
          index: schema.string(),
          data: schema.any(),
        }),
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_DRAWING_SIZE_BYTES,
        },
      },
    },
    async (context, request, response) => {
      const result = await writeDataToIndex(
        request.body.index,
        request.body.data,
        context.core.elasticsearch.client.asCurrentUser
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

  router.delete(
    {
      path: `${INDEX_FEATURE_PATH}/{featureId}`,
      validate: {
        params: schema.object({
          featureId: schema.string(),
        }),
        body: schema.object({
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { body: resp } = await context.core.elasticsearch.client.asCurrentUser.delete({
          index: request.body.index,
          id: request.params.featureId,
          refresh: true,
        });
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

  router.get(
    {
      path: GET_MATCHING_INDEXES_PATH,
      validate: {
        query: schema.object({
          indexPattern: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return await getMatchingIndexes(
        request.query.indexPattern,
        context.core.elasticsearch.client,
        response,
        logger
      );
    }
  );

  router.get(
    {
      path: CHECK_IS_DRAWING_INDEX,
      validate: {
        query: schema.object({
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { index } = request.query;
      try {
        const { body: mappingsResp } =
          await context.core.elasticsearch.client.asCurrentUser.indices.getMapping({
            index: request.query.index,
          });
        const isDrawingIndex =
          mappingsResp[index].mappings?._meta?.created_by === MAPS_NEW_VECTOR_LAYER_META_CREATED_BY;
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
