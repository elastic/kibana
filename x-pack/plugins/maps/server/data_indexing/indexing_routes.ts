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
  INDEX_FEATURE_PATH,
} from '../../common/constants';
import { createDocSource } from './create_doc_source';
import { writeDataToIndex } from './index_data';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

export function initIndexingRoutes({
  router,
  logger,
  dataPlugin,
}: {
  router: IRouter<DataRequestHandlerContext>;
  logger: Logger;
  dataPlugin: DataPluginStart;
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
}
