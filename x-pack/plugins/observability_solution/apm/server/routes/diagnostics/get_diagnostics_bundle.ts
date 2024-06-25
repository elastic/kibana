/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { getDataStreams } from './bundle/get_data_streams';
import { getNonDataStreamIndices } from './bundle/get_non_data_stream_indices';
import { getElasticsearchVersion } from './get_elasticsearch_version';
import { getIndexTemplatesByIndexPattern } from './bundle/get_index_templates_by_index_pattern';
import { getExistingApmIndexTemplates } from './bundle/get_existing_index_templates';
import { getIndicesStates } from './bundle/get_indices_states';
import { getApmEvents } from './bundle/get_apm_events';
import { getApmIndexTemplates } from './helpers/get_apm_index_template_names';
import { handleExceptions } from './helpers/handle_exceptions';
import { getDiagnosticsPrivileges } from './helpers/get_diagnostic_privileges';

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
  apmIndices: APMIndices;
  start: number | undefined;
  end: number | undefined;
  kuery: string | undefined;
}) {
  const diagnosticsPrivileges = await getDiagnosticsPrivileges({
    esClient,
    apmIndices,
  });

  const indexTemplatesByIndexPattern =
    (await handleExceptions(
      getIndexTemplatesByIndexPattern({
        esClient,
        apmIndices,
      })
    )) ?? [];

  const existingIndexTemplates =
    (await handleExceptions(
      getExistingApmIndexTemplates({
        esClient,
      })
    )) ?? [];

  const dataStreams = (await handleExceptions(getDataStreams({ esClient, apmIndices }))) ?? [];

  const nonDataStreamIndices =
    (await handleExceptions(
      getNonDataStreamIndices({
        esClient,
        apmIndices,
      })
    )) ?? [];

  const { invalidIndices, validIndices, indices, ingestPipelines, fieldCaps } =
    (await handleExceptions(
      getIndicesStates({
        esClient,
        apmIndices,
      })
    )) ?? {};

  const apmEvents =
    (await handleExceptions(
      getApmEvents({
        esClient,
        apmIndices,
        start,
        end,
        kuery,
      })
    )) ?? [];

  const elasticsearchVersion =
    (await handleExceptions(getElasticsearchVersion(esClient))) ?? NOT_AVAILABLE_LABEL;

  return {
    created_at: new Date().toISOString(),
    diagnosticsPrivileges,
    apmIndices,
    elasticsearchVersion,
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
