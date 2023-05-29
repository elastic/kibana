/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { getDefaultApmIndexTemplateStates } from './get_default_apm_index_templates_states';
import { getMatchingIndexTemplates } from './get_matching_index_templates';

export async function getIndexTemplatesByIndexPattern({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
}) {
  const defaultApmIndexTemplateStates = await getDefaultApmIndexTemplateStates({
    esClient,
  });
  return getMatchingIndexTemplates({
    apmIndices,
    esClient,
    defaultApmIndexTemplateStates,
  });
}
