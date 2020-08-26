/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { deserializeDataStream, deserializeDataStreamList } from '../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const querySchema = schema.object({
  includeStats: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerGetAllRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/data_streams'), validate: { query: querySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      const includeStats = (req.query as TypeOf<typeof querySchema>).includeStats === 'true';

      try {
        const { data_streams: dataStreams } = await callAsCurrentUser(
          'dataManagement.getDataStreams'
        );

        if (includeStats) {
          const {
            data_streams: dataStreamsStats,
          } = await ctx.core.elasticsearch.legacy.client.callAsCurrentUser('transport.request', {
            path: '/_data_stream/*/_stats',
            method: 'GET',
            query: {
              human: true,
            },
          });

          // Merge stats into data streams.
          for (let i = 0; i < dataStreams.length; i++) {
            const dataStream = dataStreams[i];

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { store_size, maximum_timestamp } = dataStreamsStats.find(
              ({ data_stream: statsName }: { data_stream: string }) => statsName === dataStream.name
            );

            dataStreams[i] = {
              ...dataStream,
              store_size,
              maximum_timestamp,
            };
          }
        }

        return res.ok({ body: deserializeDataStreamList(dataStreams) });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
}

export function registerGetOneRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });

  router.get(
    {
      path: addBasePath('/data_streams/{name}'),
      validate: { params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { name } = req.params as TypeOf<typeof paramsSchema>;
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const [
          { data_streams: dataStream },
          { data_streams: dataStreamsStats },
        ] = await Promise.all([
          callAsCurrentUser('dataManagement.getDataStream', { name }),
          ctx.core.elasticsearch.legacy.client.callAsCurrentUser('transport.request', {
            path: `/_data_stream/${name}/_stats`,
            method: 'GET',
            query: {
              human: true,
            },
          }),
        ]);

        if (dataStream[0]) {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { store_size, maximum_timestamp } = dataStreamsStats[0];
          dataStream[0] = {
            ...dataStream[0],
            store_size,
            maximum_timestamp,
          };
          const body = deserializeDataStream(dataStream[0]);
          return res.ok({ body });
        }

        return res.notFound();
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
