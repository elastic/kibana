/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

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
    .filter((indexTemplate) => indexTemplate.index_template?.composed_of?.includes(name))
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

export const registerReferencedIndexTemplateMeta = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.get(
    {
      path: addBasePath('/component_templates/{name}/referenced_index_template_meta'),
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name } = request.params;

      try {
        const { index_templates: indexTemplates } =
          await client.asCurrentUser.indices.getIndexTemplate();
        const result = indexTemplates.filter((indexTemplate) =>
          indexTemplate.index_template?.composed_of?.includes(name)
        );

        // We should always match against the first result which should yield
        // the index template we are after.
        if (result[0]) {
          return response.ok({
            body: result[0].index_template._meta,
          });
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
