/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getDefaultIndexTemplateNames } from '../../../../common/diagnostics/get_default_index_template_names';
import { getIndexTemplate } from './get_index_template';

export async function getDefaultApmIndexTemplateStates({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) {
  const existingIndexTemplates = await getIndexTemplate(esClient, {
    name: '*-apm.*',
  });

  const defaultIndexTemplateNames = getDefaultIndexTemplateNames();
  const existingIndexTemplatesNames =
    existingIndexTemplates.index_templates.map(
      (indexTemplate) => indexTemplate.name
    );

  return defaultIndexTemplateNames.reduce<
    Record<string, { exists: boolean; name?: string }>
  >((acc, defaultIndexTemplateName) => {
    // the actual index template name must have the same prefix as the default index template name
    const existingIndexTemplateName = existingIndexTemplatesNames.find((name) =>
      name.startsWith(defaultIndexTemplateName)
    );

    acc[defaultIndexTemplateName] = {
      exists: existingIndexTemplateName !== undefined,
      name: existingIndexTemplateName,
    };
    return acc;
  }, {});
}
