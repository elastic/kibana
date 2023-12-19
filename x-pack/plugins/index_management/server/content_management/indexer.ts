/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexerFn } from '@kbn/content-management-plugin/server';

import { deserializeTemplateList } from '../../common/lib';
import { getCloudManagedTemplatePrefix } from '../lib/get_managed_templates';

export const getIndexTemplateIndexer = ({
  clientGetter,
}: {
  clientGetter: () => Promise<ElasticsearchClient>;
}): IndexerFn => {
  const indexer: IndexerFn = async () => {
    const { index_templates: templatesEs } = await clientGetter().then((client) =>
      client.indices.getIndexTemplate()
    );

    // @ts-expect-error TemplateSerialized.index_patterns not compatible with IndicesIndexTemplate.index_patterns
    const templates = deserializeTemplateList(templatesEs, getCloudManagedTemplatePrefix);

    return {
      items: templates.map((template) => {
        return {
          id: template.name,
          doc: template,
        };
      }),
    };
  };

  return indexer;
};
