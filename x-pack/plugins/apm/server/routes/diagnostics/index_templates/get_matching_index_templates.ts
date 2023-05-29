/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesSimulateTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { orderBy, uniq } from 'lodash';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { getIndexTemplate } from './get_index_template';

export function getApmIndexPatterns(indices: ApmIndicesConfig) {
  return uniq(
    [indices.error, indices.metric, indices.span, indices.transaction].flatMap(
      (index): string[] => index.split(',')
    )
  );
}

type DefaultApmIndexTemplateStates = Record<
  string,
  { exists: boolean; name?: string | undefined }
>;

export async function getMatchingIndexTemplates({
  esClient,
  apmIndices,
  defaultApmIndexTemplateStates,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
  defaultApmIndexTemplateStates: DefaultApmIndexTemplateStates;
}) {
  const apmIndexPatterns = getApmIndexPatterns(apmIndices);
  const indexTemplatesByIndexPattern = await Promise.all(
    apmIndexPatterns.map(async (indexPattern) => {
      const simulateResponse =
        await esClient.transport.request<IndicesSimulateTemplateResponse>({
          method: 'POST',
          path: '/_index_template/_simulate',
          body: { index_patterns: [indexPattern] },
        });

      const indexTemplates = await Promise.all(
        (simulateResponse.overlapping ?? []).map(
          async ({
            index_patterns: templateIndexPatterns,
            name: templateName,
          }) => {
            const priority = await getTemplatePriority(esClient, templateName);
            const isNonStandard = getIsNonStandardIndexTemplate(
              defaultApmIndexTemplateStates,
              templateName
            );

            return {
              priority,
              templateIndexPatterns,
              templateName,
              isNonStandard,
            };
          }
        )
      );

      return {
        indexPattern,
        indexTemplates: orderBy(
          indexTemplates,
          ({ priority }) => priority,
          'desc'
        ),
      };
    })
  );

  return indexTemplatesByIndexPattern;
}

async function getTemplatePriority(
  esClient: ElasticsearchClient,
  name: string
) {
  const res = await getIndexTemplate(esClient, { name });
  return res.index_templates[0]?.index_template?.priority;
}

function getIsNonStandardIndexTemplate(
  defaultApmIndexTemplateStates: DefaultApmIndexTemplateStates,
  templateName: string
) {
  const defaultApmIndexTemplates = Object.keys(defaultApmIndexTemplateStates);
  const defaultStackIndexTemplates = ['logs', 'metrics'];
  const isNonStandard = [
    ...defaultApmIndexTemplates,
    ...defaultStackIndexTemplates,
  ].every((defaultApmIndexTemplate) => {
    const notMatch = !templateName.startsWith(defaultApmIndexTemplate);
    return notMatch;
  });

  return isNonStandard;
}
