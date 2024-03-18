/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  findInventoryFields,
  InventoryItemType,
  inventoryModels,
} from '@kbn/metrics-data-access-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';

import { _IGNORED } from '../../../../common/es_fields';
import { DataStreamDetails } from '../../../../common/api_types';
import { createDatasetQualityESClient } from '../../../utils';
import { dataStreamService } from '../../../services';

export async function getDataStreamDetails(args: {
  esClient: ElasticsearchClient;
  dataStream: string;
  start: number;
  end: number;
}): Promise<DataStreamDetails> {
  const { esClient, dataStream, start, end } = args;

  if (!dataStream?.trim()) {
    throw badRequest(`Data Stream name cannot be empty. Received value "${dataStream}"`);
  }

  const createdOn = await getDataStreamCreatedOn(esClient, dataStream);
  const dataStreamSummaryStats = await getDataStreamSummaryStats(esClient, dataStream, start, end);
  const avgDocSizeInBytes =
    dataStreamSummaryStats.docsCount > 0 ? await getAvgDocSizeInBytes(esClient, dataStream) : 0;
  const sizeBytes = Math.ceil(avgDocSizeInBytes * dataStreamSummaryStats.docsCount);

  return {
    createdOn,
    ...dataStreamSummaryStats,
    sizeBytes,
  };
}

async function getDataStreamCreatedOn(esClient: ElasticsearchClient, dataStream: string) {
  const indexSettings = await dataStreamService.getDataSteamIndexSettings(esClient, dataStream);

  const indexesList = Object.values(indexSettings);

  return indexesList
    .map((index) => Number(index.settings?.index?.creation_date))
    .sort((a, b) => a - b)[0];
}

type TermAggregation = Record<string, { terms: { field: string; size: number } }>;

const MAX_HOSTS = 50;

// Gather service.name terms
const serviceNamesAgg: TermAggregation = {
  ['service.name']: { terms: { field: 'service.name', size: MAX_HOSTS } },
};

// Gather host terms like 'host', 'pod', 'container'
const hostsAgg: TermAggregation = inventoryModels
  .map((model) => findInventoryFields(model.id as InventoryItemType))
  .reduce(
    (acc, fields) => ({ ...acc, [fields.id]: { terms: { field: fields.id, size: MAX_HOSTS } } }),
    {} as TermAggregation
  );

async function getDataStreamSummaryStats(
  esClient: ElasticsearchClient,
  dataStream: string,
  start: number,
  end: number
): Promise<{
  docsCount: number;
  degradedDocsCount: number;
  services: Record<string, string[]>;
  hosts: Record<string, string[]>;
}> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const response = await datasetQualityESClient.search({
    index: dataStream,
    query: rangeQuery(start, end)[0],
    size: 0,
    aggs: {
      total_count: {
        value_count: { field: '_index' },
      },
      degraded_count: {
        filter: { exists: { field: _IGNORED } },
      },
      ...serviceNamesAgg,
      ...hostsAgg,
    },
  });

  const docsCount = Number(response.aggregations?.total_count.value ?? 0);
  const degradedDocsCount = Number(response.aggregations?.degraded_count.doc_count ?? 0);

  return {
    docsCount,
    degradedDocsCount,
    services: getTermsFromAgg(serviceNamesAgg, response.aggregations),
    hosts: getTermsFromAgg(hostsAgg, response.aggregations),
  };
}

async function getAvgDocSizeInBytes(esClient: ElasticsearchClient, index: string) {
  const indexStats = await esClient.indices.stats({ index });
  const docCount = indexStats._all.total?.docs?.count ?? 0;
  const sizeInBytes = indexStats._all.total?.store?.size_in_bytes ?? 0;

  return docCount ? sizeInBytes / docCount : 0;
}

function getTermsFromAgg(termAgg: TermAggregation, aggregations: any) {
  return Object.entries(termAgg).reduce((acc, [key, value]) => {
    const values = aggregations[key]?.buckets.map((bucket: any) => bucket.key) as string[];
    return { ...acc, [key]: values };
  }, {});
}
