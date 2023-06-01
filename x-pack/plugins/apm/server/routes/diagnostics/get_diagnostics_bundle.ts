/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import { getDataStreams } from './bundle/get_data_streams';
import { getNonDataStreamIndices } from './bundle/get_non_data_stream_indices';
import { getApmIndexTemplatePrefixes } from './get_apm_index_template_prefixes';
import { getElasticsearchVersion } from './get_elasticsearch_version';
import { getIndexTemplatesByIndexPattern } from './bundle/get_index_templates_by_index_pattern';
import { getExistingApmIndexTemplates } from './bundle/get_existing_index_templates';
import { getFieldCaps } from './bundle/get_field_caps';
import { getIndicesAndIngestPipelines } from './bundle/get_indices';
import { getIndicesStates } from './bundle/get_indices_states';

export async function getDiagnosticsBundle(
  esClient: ElasticsearchClient,
  apmIndices: ApmIndicesConfig
) {
  const apmIndexTemplatePrefixes = getApmIndexTemplatePrefixes();

  const { indices, ingestPipelines } = await getIndicesAndIngestPipelines({
    esClient,
    apmIndices,
  });

  const indexTemplatesByIndexPattern = await getIndexTemplatesByIndexPattern({
    esClient,
    apmIndices,
  });

  const existingIndexTemplates = await getExistingApmIndexTemplates({
    esClient,
  });

  const fieldCaps = await getFieldCaps({ esClient, apmIndices });
  const dataStreams = await getDataStreams({ esClient, apmIndices });
  const nonDataStreamIndices = await getNonDataStreamIndices({
    esClient,
    apmIndices,
  });

  const { invalidIndices, validIndices } = getIndicesStates({
    fieldCaps,
    indices,
    ingestPipelines,
  });

  return {
    created_at: new Date().toISOString(),
    elasticsearchVersion: await getElasticsearchVersion(esClient),
    esResponses: {
      fieldCaps,
      indices,
      ingestPipelines,
      existingIndexTemplates,
    },
    apmIndexTemplates: getApmIndexTemplates(
      apmIndexTemplatePrefixes,
      existingIndexTemplates
    ),
    invalidIndices,
    validIndices,
    indexTemplatesByIndexPattern,
    dataStreams,
    nonDataStreamIndices,
  };
}

function getApmIndexTemplates(
  apmIndexTemplatePrefixes: string[],
  existingIndexTemplates: IndicesGetIndexTemplateResponse
) {
  const standardIndexTemplates = apmIndexTemplatePrefixes.map(
    (indexTemplatePrefix) => {
      const matchingTemplate = existingIndexTemplates.index_templates.find(
        ({ name }) => name.startsWith(indexTemplatePrefix)
      );

      return {
        prefix: indexTemplatePrefix,
        name: matchingTemplate?.name,
        exists: Boolean(matchingTemplate),
        isNonStandard: false,
      };
    }
  );

  const nonStandardIndexTemplates = existingIndexTemplates.index_templates
    .filter(
      (indexTemplate) =>
        standardIndexTemplates.some(
          ({ name }) => name === indexTemplate.name
        ) === false
    )
    .map((indexTemplate) => ({
      name: indexTemplate.name,
      isNonStandard: true,
      exists: true,
    }));

  return [...standardIndexTemplates, ...nonStandardIndexTemplates];
}
