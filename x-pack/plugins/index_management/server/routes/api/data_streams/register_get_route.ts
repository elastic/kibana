/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { IScopedClusterClient } from 'kibana/server';
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
  store_size_bytes: number;
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
      const { store_size, store_size_bytes, maximum_timestamp } =
        dataStreamsStats.find(
          ({ data_stream: statsName }: { data_stream: string }) => statsName === dataStream.name
        ) || {};

      enhancedDataStream = {
        ...enhancedDataStream,
        store_size,
        store_size_bytes,
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

const getDataStreams = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.getDataStream({
    name,
    expand_wildcards: 'all',
  });
};

const getDataStreamsStats = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.dataStreamsStats({
    name,
    expand_wildcards: 'all',
    human: true,
  });
};

const getDataStreamsPrivileges = (client: IScopedClusterClient, names: string[]) => {
  return client.asCurrentUser.security.hasPrivileges({
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

export function registerGetAllRoute({ router, lib: { handleEsError }, config }: RouteDependencies) {
  const querySchema = schema.object({
    includeStats: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
  });
  router.get(
    { path: addBasePath('/data_streams'), validate: { query: querySchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;

      const includeStats = (request.query as TypeOf<typeof querySchema>).includeStats === 'true';

      try {
        const { data_streams: dataStreams } = await getDataStreams(client);

        let dataStreamsStats;
        let dataStreamsPrivileges;

        if (includeStats) {
          ({ data_streams: dataStreamsStats } = await getDataStreamsStats(client));
        }

        if (config.isSecurityEnabled() && dataStreams.length > 0) {
          dataStreamsPrivileges = await getDataStreamsPrivileges(
            client,
            dataStreams.map((dataStream) => dataStream.name)
          );
        }

        const enhancedDataStreams = enhanceDataStreams({
          // @ts-expect-error DataStreamFromEs conflicts with @elastic/elasticsearch IndicesGetDataStreamIndicesGetDataStreamItem
          dataStreams,
          // @ts-expect-error StatsFromEs conflicts with @elastic/elasticsearch IndicesDataStreamsStatsDataStreamsStatsItem
          dataStreamsStats,
          // @ts-expect-error PrivilegesFromEs conflicts with @elastic/elasticsearch ApplicationsPrivileges
          dataStreamsPrivileges,
        });

        return response.ok({ body: deserializeDataStreamList(enhancedDataStreams) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerGetOneRoute({ router, lib: { handleEsError }, config }: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });
  router.get(
    {
      path: addBasePath('/data_streams/{name}'),
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params as TypeOf<typeof paramsSchema>;
      const { client } = context.core.elasticsearch;
      try {
        const [{ data_streams: dataStreams }, { data_streams: dataStreamsStats }] =
          await Promise.all([getDataStreams(client, name), getDataStreamsStats(client, name)]);

        if (dataStreams[0]) {
          let dataStreamsPrivileges;
          if (config.isSecurityEnabled()) {
            dataStreamsPrivileges = await getDataStreamsPrivileges(client, [dataStreams[0].name]);
          }

          const enhancedDataStreams = enhanceDataStreams({
            // @ts-expect-error DataStreamFromEs conflicts with @elastic/elasticsearch IndicesGetDataStreamIndicesGetDataStreamItem
            dataStreams,
            // @ts-expect-error StatsFromEs conflicts with @elastic/elasticsearch IndicesDataStreamsStatsDataStreamsStatsItem
            dataStreamsStats,
            // @ts-expect-error PrivilegesFromEs conflicts with @elastic/elasticsearch ApplicationsPrivileges
            dataStreamsPrivileges,
          });
          const body = deserializeDataStream(enhancedDataStreams[0]);
          return response.ok({ body });
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
