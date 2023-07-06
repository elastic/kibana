/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import { getDataStreams } from './bundle/get_data_streams';
import { getNonDataStreamIndices } from './bundle/get_non_data_stream_indices';
import { getElasticsearchVersion } from './get_elasticsearch_version';
import { getIndexTemplatesByIndexPattern } from './bundle/get_index_templates_by_index_pattern';
import { getExistingApmIndexTemplates } from './bundle/get_existing_index_templates';
import { getFieldCaps } from './bundle/get_field_caps';
import { getIndicesAndIngestPipelines } from './bundle/get_indices';
import { getIndicesStates } from './bundle/get_indices_states';
import { getApmEvents } from './bundle/get_apm_events';
import { getApmIndexTemplates } from './helpers/get_apm_index_template_names';

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

  const apmEvents = await getApmEvents({
    esClient,
    apmIndices,
    start,
    end,
    kuery,
  });

  return {
    created_at: new Date().toISOString(),
    apmIndices,
    elasticsearchVersion: await getElasticsearchVersion(esClient),
    esResponses: {
      fieldCaps,
      indices,
      ingestPipelines,
      existingIndexTemplates,
    },
    apmIndexTemplates: getApmIndexTemplates(existingIndexTemplates),
    invalidIndices,
    validIndices,
    indexTemplatesByIndexPattern,
    dataStreams,
    nonDataStreamIndices,
    apmEvents,
    params: { start, end, kuery },
  };
}
