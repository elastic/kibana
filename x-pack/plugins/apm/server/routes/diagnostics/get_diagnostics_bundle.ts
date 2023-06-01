/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import { getDataStreams } from './bundle/get_data_streams';
import { getNonDataStreamIndices } from './bundle/get_non_data_stream_indices';
import { getApmIndexTemplateNames } from './get_apm_index_template_prefixes';
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
  const apmIndexTemplateNames = getApmIndexTemplateNames();

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
    apmIndexTemplateNames,
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
      apmIndexTemplateNames,
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
  apmIndexTemplateNames: string[],
  existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]
) {
  const standardIndexTemplates = apmIndexTemplateNames.map(
    (indexTemplatePrefix) => {
      const matchingTemplate = existingIndexTemplates.find(
        ({ name }) => name === indexTemplatePrefix
      );

      return {
        prefix: indexTemplatePrefix,
        name: matchingTemplate?.name,
        exists: Boolean(matchingTemplate),
        isNonStandard: false,
      };
    }
  );

  const nonStandardIndexTemplates = existingIndexTemplates
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
