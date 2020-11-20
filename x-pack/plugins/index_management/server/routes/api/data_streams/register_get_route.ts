/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { ElasticsearchClient } from 'kibana/server';
import { deserializeDataStream, deserializeDataStreamList } from '../../../../common/lib';
import { DataStreamFromEs } from '../../../../common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

interface PrivilegesFromEs {
  username: string;
  has_all_requested: boolean;
  cluster: Record<string, boolean>;
  index: Record<string, Record<string, boolean>>;
  application: Record<string, boolean>;
}

interface StatsFromEs {
  data_stream: string;
  store_size: string;
  maximum_timestamp: number;
}

const enhanceDataStreams = ({
  dataStreams,
  dataStreamsStats,
  dataStreamsPrivileges,
}: {
  dataStreams: DataStreamFromEs[];
  dataStreamsStats?: StatsFromEs[];
  dataStreamsPrivileges?: PrivilegesFromEs;
}): DataStreamFromEs[] => {
  return dataStreams.map((dataStream: DataStreamFromEs) => {
    let enhancedDataStream = { ...dataStream };

    if (dataStreamsStats) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { store_size, maximum_timestamp } = dataStreamsStats.find(
        ({ data_stream: statsName }: { data_stream: string }) => statsName === dataStream.name
      )!;

      enhancedDataStream = {
        ...enhancedDataStream,
        store_size,
        maximum_timestamp,
      };
    }

    enhancedDataStream = {
      ...enhancedDataStream,
      privileges: {
        delete_index: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].delete_index
          : true,
      },
    };

    return enhancedDataStream;
  });
};

const getDataStreamsStats = (client: ElasticsearchClient, name = '*') => {
  return client.transport.request({
    path: `/_data_stream/${encodeURIComponent(name)}/_stats`,
    method: 'GET',
    querystring: {
      human: true,
    },
  });
};

const getDataStreamsPrivileges = (client: ElasticsearchClient, names: string[]) => {
  return client.security.hasPrivileges<PrivilegesFromEs>({
    body: {
      index: [
        {
          names,
          privileges: ['delete_index'],
        },
      ],
    },
  });
};

export function registerGetAllRoute({
  router,
  license,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const querySchema = schema.object({
    includeStats: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
  });
  router.get(
    { path: addBasePath('/data_streams'), validate: { query: querySchema } },
    license.guardApiRoute(async (ctx, req, response) => {
      const { asCurrentUser } = ctx.core.elasticsearch.client;

      const includeStats = (req.query as TypeOf<typeof querySchema>).includeStats === 'true';

      try {
        let {
          body: { data_streams: dataStreams },
        } = await asCurrentUser.indices.getDataStream();

        let dataStreamsStats;
        let dataStreamsPrivileges;

        if (includeStats) {
          ({
            body: { data_streams: dataStreamsStats },
          } = await getDataStreamsStats(asCurrentUser));
        }

        if (config.isSecurityEnabled() && dataStreams.length > 0) {
          ({ body: dataStreamsPrivileges } = await getDataStreamsPrivileges(
            asCurrentUser,
            dataStreams.map((dataStream: DataStreamFromEs) => dataStream.name)
          ));
        }

        dataStreams = enhanceDataStreams({
          dataStreams,
          dataStreamsStats,
          dataStreamsPrivileges,
        });

        return response.ok({ body: deserializeDataStreamList(dataStreams) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}

export function registerGetOneRoute({
  router,
  license,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });
  router.get(
    {
      path: addBasePath('/data_streams/{name}'),
      validate: { params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, response) => {
      const { name } = req.params as TypeOf<typeof paramsSchema>;
      const { asCurrentUser } = ctx.core.elasticsearch.client;
      try {
        const [
          {
            body: { data_streams: dataStreams },
          },
          {
            body: { data_streams: dataStreamsStats },
          },
        ] = await Promise.all([
          asCurrentUser.indices.getDataStream({ name }),
          getDataStreamsStats(asCurrentUser, name),
        ]);

        if (dataStreams[0]) {
          let dataStreamsPrivileges;
          if (config.isSecurityEnabled()) {
            ({ body: dataStreamsPrivileges } = await getDataStreamsPrivileges(asCurrentUser, [
              dataStreams[0].name,
            ]));
          }

          const enhancedDataStreams = enhanceDataStreams({
            dataStreams,
            dataStreamsStats,
            dataStreamsPrivileges,
          });
          const body = deserializeDataStream(enhancedDataStreams[0]);
          return response.ok({ body });
        }

        return response.notFound();
      } catch (error) {
        handleEsError({ error, response });
      }
    })
  );
}
