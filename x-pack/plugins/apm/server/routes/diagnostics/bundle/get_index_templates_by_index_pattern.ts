/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IndicesSimulateTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { orderBy } from 'lodash';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { getApmIndexPatterns } from './get_indices';
import { getIndexTemplate } from './get_index_template';
import { getApmIndexTemplatePrefixes } from '../get_apm_index_template_prefixes';

export async function getIndexTemplatesByIndexPattern({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
}) {
  const indexPatterns = getApmIndexPatterns([
    apmIndices.error,
    apmIndices.metric,
    apmIndices.span,
    apmIndices.transaction,
  ]);

  return Promise.all(
    indexPatterns.map(async (indexPattern) =>
      getSimulatedIndexTemplateForIndexPattern({ indexPattern, esClient })
    )
  );
}

async function getSimulatedIndexTemplateForIndexPattern({
  esClient,
  indexPattern,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
}) {
  const simulatedIndexTemplate =
    await esClient.transport.request<IndicesSimulateTemplateResponse>({
      method: 'POST',
      path: '/_index_template/_simulate',
      body: { index_patterns: [indexPattern] },
    });

  const indexTemplates = await Promise.all(
    (simulatedIndexTemplate.overlapping ?? []).map(
      async ({ index_patterns: templateIndexPatterns, name: templateName }) => {
        const priority = await getTemplatePriority(esClient, templateName);
        const isNonStandard = getIsNonStandardIndexTemplate(templateName);
        return {
          isNonStandard,
          priority,
          templateIndexPatterns,
          templateName,
        };
      }
    )
  );

  return {
    indexPattern,
    indexTemplates: orderBy(indexTemplates, ({ priority }) => priority, 'desc'),
  };
}

async function getTemplatePriority(
  esClient: ElasticsearchClient,
  name: string
) {
  const res = await getIndexTemplate(esClient, { name });
  return res.index_templates[0]?.index_template?.priority;
}

function getIsNonStandardIndexTemplate(templateName: string) {
  const apmIndexTemplatePrefixes = getApmIndexTemplatePrefixes();
  const stackIndexTemplatePrefixes = ['logs', 'metrics'];
  const isNonStandard = [
    ...apmIndexTemplatePrefixes,
    ...stackIndexTemplatePrefixes,
  ].every((prefix) => {
    const notMatch = !templateName.startsWith(prefix);
    return notMatch;
  });

  return isNonStandard;
}
