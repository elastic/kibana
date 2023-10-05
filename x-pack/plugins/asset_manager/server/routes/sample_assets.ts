/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import { ASSET_MANAGER_API_BASE } from '../../common/constants_routes';
import { getSampleAssetDocs, sampleAssets } from '../lib/sample_assets';
import { writeAssets } from '../lib/write_assets';
import { SetupRouteOptions } from './types';
import { getClientsFromContext } from './utils';

export type WriteSamplesPostBody = {
  baseDateTime?: string | number;
  excludeEans?: string[];
  refresh?: boolean | 'wait_for';
} | null;

export function sampleAssetsRoutes<T extends RequestHandlerContext>({
  router,
}: SetupRouteOptions<T>) {
  const SAMPLE_ASSETS_API_PATH = `${ASSET_MANAGER_API_BASE}/assets/sample`;

  // GET sample assets
  router.get<unknown, unknown, unknown>(
    {
      path: SAMPLE_ASSETS_API_PATH,
      validate: {},
    },
    async (context, req, res) => {
      return res.ok({ body: { results: sampleAssets } });
    }
  );

  // POST sample assets
  router.post<unknown, unknown, WriteSamplesPostBody>(
    {
      path: SAMPLE_ASSETS_API_PATH,
      validate: {
        body: schema.nullable(
          schema.object({
            baseDateTime: schema.maybe(
              schema.oneOf<string, number>([schema.string(), schema.number()])
            ),
            excludeEans: schema.maybe(schema.arrayOf(schema.string())),
            refresh: schema.maybe(schema.oneOf([schema.boolean(), schema.literal('wait_for')])),
          })
        ),
      },
    },
    async (context, req, res) => {
      const { baseDateTime, excludeEans, refresh } = req.body || {};
      const parsed = baseDateTime === undefined ? undefined : new Date(baseDateTime);
      if (parsed?.toString() === 'Invalid Date') {
        return res.customError({
          statusCode: 400,
          body: {
            message: `${baseDateTime} is not a valid date time value`,
          },
        });
      }
      const { elasticsearchClient } = await getClientsFromContext(context);
      const assetDocs = getSampleAssetDocs({ baseDateTime: parsed, excludeEans });

      try {
        const response = await writeAssets({
          elasticsearchClient,
          assetDocs,
          namespace: 'sample_data',
          refresh,
        });

        if (response.errors) {
          return res.customError({
            statusCode: 500,
            body: {
              message: JSON.stringify(response.errors),
            },
          });
        }

        return res.ok({ body: response });
      } catch (error: any) {
        return res.customError({
          statusCode: 500,
          body: {
            message: error.message || 'unknown error occurred while creating sample assets',
          },
        });
      }
    }
  );

  // DELETE all sample assets
  router.delete(
    {
      path: SAMPLE_ASSETS_API_PATH,
      validate: {},
    },
    async (context, req, res) => {
      const { elasticsearchClient } = await getClientsFromContext(context);

      const sampleDataStreams = await elasticsearchClient.indices.getDataStream({
        name: 'assets-*-sample_data',
        expand_wildcards: 'all',
      });

      const deletedDataStreams: string[] = [];
      let errorWhileDeleting: string | null = null;
      const dataStreamsToDelete = sampleDataStreams.data_streams.map((ds) => ds.name);

      for (let i = 0; i < dataStreamsToDelete.length; i++) {
        const dsName = dataStreamsToDelete[i];
        try {
          await elasticsearchClient.indices.deleteDataStream({ name: dsName });
          deletedDataStreams.push(dsName);
        } catch (error: any) {
          errorWhileDeleting =
            typeof error.message === 'string'
              ? error.message
              : `Unknown error occurred while deleting sample data streams, at data stream name: ${dsName}`;
          break;
        }
      }

      if (!errorWhileDeleting && deletedDataStreams.length === dataStreamsToDelete.length) {
        return res.ok({ body: { deleted: deletedDataStreams } });
      } else {
        return res.custom({
          statusCode: 500,
          body: {
            message: ['Not all found data streams were deleted', errorWhileDeleting].join(' - '),
            deleted: deletedDataStreams,
            matching: dataStreamsToDelete,
          },
        });
      }
    }
  );
}
