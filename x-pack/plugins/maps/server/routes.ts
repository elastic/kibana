/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import fs from 'fs';
import path from 'path';
import { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { INDEX_SETTINGS_API_PATH, FONTS_API_PATH } from '../common/constants';
import { getIndexPatternSettings } from './lib/get_index_pattern_settings';
import { initMVTRoutes } from './mvt/mvt_routes';
import { initIndexingRoutes } from './data_indexing/indexing_routes';
import { StartDeps } from './types';

export function initRoutes(coreSetup: CoreSetup<StartDeps>, logger: Logger) {
  const router: IRouter<DataRequestHandlerContext> = coreSetup.http.createRouter();

  router.versioned
    .get({
      path: `${FONTS_API_PATH}/{fontstack}/{range}`,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              fontstack: schema.string(),
              range: schema.string(),
            }),
          },
        },
      },
      (context, request, response) => {
        const range = path.normalize(request.params.range);
        const rootPath = path.resolve(__dirname, 'fonts', 'open_sans');
        const fontPath = path.resolve(rootPath, `${range}.pbf`);
        return !fontPath.startsWith(rootPath)
          ? response.notFound()
          : new Promise((resolve) => {
              fs.readFile(fontPath, (error, data) => {
                if (error) {
                  resolve(response.notFound());
                } else {
                  resolve(
                    response.ok({
                      body: data,
                    })
                  );
                }
              });
            });
      }
    );

  router.versioned
    .get({
      path: INDEX_SETTINGS_API_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              indexPatternTitle: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { query } = request;
        if (!query.indexPatternTitle) {
          logger.warn(`Required query parameter 'indexPatternTitle' not provided.`);
          return response.custom({
            body: `Required query parameter 'indexPatternTitle' not provided.`,
            statusCode: 400,
          });
        }

        try {
          const coreContext = await context.core;
          const resp = await coreContext.elasticsearch.client.asCurrentUser.indices.getSettings({
            index: query.indexPatternTitle,
          });
          const indexPatternSettings = getIndexPatternSettings(
            resp as unknown as Record<string, string | number | boolean>
          );
          return response.ok({
            body: indexPatternSettings,
          });
        } catch (error) {
          logger.warn(
            `Cannot load index settings for data view '${query.indexPatternTitle}', error: ${error.message}.`
          );
          return response.custom({
            body: 'Error loading index settings',
            statusCode: 400,
          });
        }
      }
    );

  initMVTRoutes({
    router,
    logger,
    getCore: async () => {
      const [core] = await coreSetup.getStartServices();
      return core;
    },
  });
  initIndexingRoutes({
    router,
    logger,
    getDataPlugin: async () => {
      const [, { data }] = await coreSetup.getStartServices();
      return data;
    },
  });
}
