/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getApmIndexTemplateNames } from '../helpers/get_apm_index_template_names';
import { getIndexTemplate } from './get_index_template';

export type ApmIndexTemplateStates = Record<
  string,
  { exists: boolean; name?: string | undefined }
>;

// Check whether the default APM index templates exist
export async function getExistingApmIndexTemplates({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) {
  const apmIndexTemplateNames = getApmIndexTemplateNames();
  const values = await Promise.all(
    apmIndexTemplateNames.map(async (indexTemplateName) => {
      const res = await getIndexTemplate(esClient, { name: indexTemplateName });
      return res.index_templates[0];
    })
  );

  return values.filter((v) => v !== undefined);
}
