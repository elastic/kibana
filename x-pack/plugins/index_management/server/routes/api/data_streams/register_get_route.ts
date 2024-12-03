/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { IScopedClusterClient } from '@kbn/core/server';
import {
  IndicesDataStream,
  IndicesDataStreamsStatsDataStreamsStatsItem,
  IndicesGetIndexTemplateIndexTemplateItem,
  SecurityHasPrivilegesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { MeteringStats } from '../../../lib/types';
import {
  deserializeDataStream,
  deserializeDataStreamList,
} from '../../../lib/data_stream_serialization';
import { EnhancedDataStreamFromEs } from '../../../../common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

interface MeteringStatsResponse {
  datastreams: MeteringStats[];
}
const enhanceDataStreams = ({
  dataStreams,
  dataStreamsStats,
  meteringStats,
  dataStreamsPrivileges,
  globalMaxRetention,
  indexTemplates,
}: {
  dataStreams: IndicesDataStream[];
  dataStreamsStats?: IndicesDataStreamsStatsDataStreamsStatsItem[];
  meteringStats?: MeteringStats[];
  dataStreamsPrivileges?: SecurityHasPrivilegesResponse;
  globalMaxRetention?: string;
  indexTemplates?: IndicesGetIndexTemplateIndexTemplateItem[];
}): EnhancedDataStreamFromEs[] => {
  return dataStreams.map((dataStream) => {
    const enhancedDataStream: EnhancedDataStreamFromEs = {
      ...dataStream,
      ...(globalMaxRetention ? { global_max_retention: globalMaxRetention } : {}),
      privileges: {
        delete_index: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].delete_index
          : true,
        manage_data_stream_lifecycle: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].manage_data_stream_lifecycle
          : true,
      },
    };

    if (dataStreamsStats) {
      const currentDataStreamStats: IndicesDataStreamsStatsDataStreamsStatsItem | undefined =
        dataStreamsStats.find(({ data_stream: statsName }) => statsName === dataStream.name);

      if (currentDataStreamStats) {
        enhancedDataStream.store_size = currentDataStreamStats.store_size;
        enhancedDataStream.store_size_bytes = currentDataStreamStats.store_size_bytes;
        enhancedDataStream.maximum_timestamp = currentDataStreamStats.maximum_timestamp;
      }
    }

    if (meteringStats) {
      const datastreamMeteringStats = meteringStats.find((s) => s.name === dataStream.name);
      if (datastreamMeteringStats) {
        enhancedDataStream.metering_size_in_bytes = datastreamMeteringStats.size_in_bytes;
        enhancedDataStream.metering_doc_count = datastreamMeteringStats.num_docs;
      }
    }

    if (indexTemplates) {
      const indexTemplate = indexTemplates.find(
        (template) => template.name === dataStream.template
      );
      if (indexTemplate) {
        enhancedDataStream.index_mode =
          indexTemplate.index_template?.template?.settings?.index?.mode;
      }
    }

    return enhancedDataStream;
  });
};

const getDataStreams = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.getDataStream({
    name,
    expand_wildcards: 'all',
  });
};

const getDataStreamLifecycle = (client: IScopedClusterClient, name: string) => {
  return client.asCurrentUser.indices.getDataLifecycle({
    name,
  });
};

const getDataStreamsStats = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.dataStreamsStats({
    name,
    expand_wildcards: 'all',
    human: true,
  });
};

const getMeteringStats = (client: IScopedClusterClient, name?: string) => {
  let path = `/_metering/stats`;
  if (name) {
    path = `${path}/${name}`;
  }
  return client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
    method: 'GET',
    path,
  });
};

const getDataStreamsPrivileges = (client: IScopedClusterClient, names: string[]) => {
  return client.asCurrentUser.security.hasPrivileges({
    body: {
      index: [
        {
          names,
          privileges: ['delete_index', 'manage_data_stream_lifecycle'],
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
      const { client } = (await context.core).elasticsearch;

      const includeStats = (request.query as TypeOf<typeof querySchema>).includeStats === 'true';

      try {
        const { data_streams: dataStreams } = await getDataStreams(client);

        let dataStreamsStats;
        let dataStreamsPrivileges;
        let meteringStats;

        if (includeStats && config.isDataStreamStatsEnabled !== false) {
          ({ data_streams: dataStreamsStats } = await getDataStreamsStats(client));
        }
        if (includeStats && config.isSizeAndDocCountEnabled !== false) {
          ({ datastreams: meteringStats } = await getMeteringStats(client));
        }

        if (config.isSecurityEnabled() && dataStreams.length > 0) {
          dataStreamsPrivileges = await getDataStreamsPrivileges(
            client,
            dataStreams.map((dataStream) => dataStream.name)
          );
        }

        const { index_templates: indexTemplates } =
          await client.asCurrentUser.indices.getIndexTemplate();

        const enhancedDataStreams = enhanceDataStreams({
          dataStreams,
          dataStreamsStats,
          meteringStats,
          dataStreamsPrivileges,
          indexTemplates,
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
      const { client } = (await context.core).elasticsearch;
      let dataStreamsStats;
      let meteringStats;

      try {
        const { data_streams: dataStreams } = await getDataStreams(client, name);

        const lifecycle = await getDataStreamLifecycle(client, name);
        // @ts-ignore - TS doesn't know about the `global_retention` property yet
        const globalMaxRetention = lifecycle?.global_retention?.max_retention;

        if (config.isDataStreamStatsEnabled !== false) {
          ({ data_streams: dataStreamsStats } = await getDataStreamsStats(client, name));
        }

        if (config.isSizeAndDocCountEnabled !== false) {
          ({ datastreams: meteringStats } = await getMeteringStats(client, name));
        }

        if (dataStreams[0]) {
          let dataStreamsPrivileges;
          let indexTemplates;

          if (config.isSecurityEnabled()) {
            dataStreamsPrivileges = await getDataStreamsPrivileges(client, [dataStreams[0].name]);
          }

          if (dataStreams[0].template) {
            const { index_templates: templates } =
              await client.asCurrentUser.indices.getIndexTemplate({
                name: dataStreams[0].template,
              });

            if (templates) {
              indexTemplates = templates;
            }
          }

          const enhancedDataStreams = enhanceDataStreams({
            dataStreams,
            dataStreamsStats,
            meteringStats,
            dataStreamsPrivileges,
            globalMaxRetention,
            indexTemplates,
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
