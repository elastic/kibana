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
import { getApmIndexTemplateNames } from './get_apm_index_template_names';
import { getElasticsearchVersion } from './get_elasticsearch_version';
import { getIndexTemplatesByIndexPattern } from './bundle/get_index_templates_by_index_pattern';
import { getExistingApmIndexTemplates } from './bundle/get_existing_index_templates';
import { getFieldCaps } from './bundle/get_field_caps';
import { getIndicesAndIngestPipelines } from './bundle/get_indices';
import { getIndicesStates } from './bundle/get_indices_states';
import { getApmEvents } from './bundle/get_apm_events';

const DEFEAULT_START = Date.now() - 60 * 5 * 1000; // 5 minutes
const DEFAULT_END = Date.now();

export async function getDiagnosticsBundle({
  esClient,
  apmIndices,
  start = DEFEAULT_START,
  end = DEFAULT_END,
  kuery,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
  start: number | undefined;
  end: number | undefined;
  kuery: string | undefined;
}) {
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

  const apmEvents = await getApmEvents({
    esClient,
    apmIndices,
    start,
    end,
    kuery,
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
    apmEvents,
    params: { start, end, kuery },
  };
}

function getApmIndexTemplates(
  apmIndexTemplateNames: string[],
  existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]
) {
  const standardIndexTemplates = apmIndexTemplateNames.map((templateName) => {
    const matchingTemplate = existingIndexTemplates.find(
      ({ name }) => name === templateName
    );

    return {
      name: templateName,
      exists: Boolean(matchingTemplate),
      isNonStandard: false,
    };
  });

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
