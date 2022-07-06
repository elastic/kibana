/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import pMap from 'p-map';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const MAX_CONCURRENT_ROLLOVER = 5;

const paramsSchema = schema.object({
  name: schema.string(),
});

async function getDatastreamsForComponentTemplate(
  esClient: ElasticsearchClient,
  name: string
): Promise<IndicesDataStream[]> {
  const { component_templates: componentTemplates } = await esClient.cluster.getComponentTemplate({
    name,
  });

  if (!componentTemplates.find((componentTemplate) => componentTemplate.name === name)) {
    return [];
  }

  const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate();

  const datastreamNames = indexTemplates
    .filter((indexTemplate) => indexTemplate.index_template.composed_of.includes(name))
    .map((indexTemplate) => indexTemplate.index_template.index_patterns)
    .flat()
    .join(',');

  if (datastreamNames.length < 0) {
    return [];
  }
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: datastreamNames,
  });

  return dataStreams;
}

export const registerPostDatastreamRollover = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: addBasePath('/component_templates/{name}/datastreams_rollover'),
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const { name } = request.params;

      try {
        const dataStreams = await getDatastreamsForComponentTemplate(client.asCurrentUser, name);

        // rollover
        await pMap(
          dataStreams,
          (ds) => {
            if (ds.replicated) {
              // rollover is not possible on replicated datastream
              return;
            }
            return client.asCurrentUser.indices.rollover({
              alias: ds.name,
            });
          },
          {
            concurrency: MAX_CONCURRENT_ROLLOVER,
          }
        );

        return response.ok({
          body: {
            data_streams: dataStreams.map((ds) => ds.name),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};

export const registerGetDatastreams = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.get(
    {
      path: addBasePath('/component_templates/{name}/datastreams'),
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const { name } = request.params;

      try {
        const dataStreams = await getDatastreamsForComponentTemplate(client.asCurrentUser, name);

        return response.ok({
          body: {
            data_streams: dataStreams.map((ds) => ds.name),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
