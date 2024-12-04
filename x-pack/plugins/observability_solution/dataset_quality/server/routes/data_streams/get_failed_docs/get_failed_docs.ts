/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  extractIndexNameFromBackingIndex,
  streamPartsToIndexPattern,
} from '../../../../common/utils';
import { DataStreamType } from '../../../../common/types';
import { DataStreamDocsStat } from '../../../../common/api_types';
import { createDatasetQualityESClient } from '../../../utils';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';

const SIZE_LIMIT = 10000;

async function getPaginatedResults(options: {
  datasetQualityESClient: DatasetQualityESClient;
  index: string;
  start: number;
  end: number;
  after?: { dataset: string };
  prevResults?: Record<string, number>;
}) {
  const { datasetQualityESClient, index, start, end, after, prevResults = {} } = options;

  const bool = {
    filter: [...rangeQuery(start, end)],
  };

  // TODO: Fix index for accesing failure store (::failures) and remove the search parameter
  const response = await datasetQualityESClient.search({
    index,
    size: 0,
    query: {
      bool,
    },
    aggs: {
      datasets: {
        composite: {
          ...(after ? { after } : {}),
          size: SIZE_LIMIT,
          sources: [{ dataset: { terms: { field: '_index' } } }],
        },
      },
    },
    failure_store: 'only',
  });

  const currResults = (response.aggregations?.datasets.buckets ?? []).reduce((acc, curr) => {
    const datasetName = extractIndexNameFromBackingIndex(curr.key.dataset as string);

    return {
      ...acc,
      [datasetName]: (acc[datasetName] ?? 0) + curr.doc_count,
    };
  }, {} as Record<string, number>);

  const results = {
    ...prevResults,
    ...currResults,
  };

  if (
    response.aggregations?.datasets.after_key &&
    response.aggregations?.datasets.buckets.length === SIZE_LIMIT
  ) {
    return getPaginatedResults({
      datasetQualityESClient,
      index,
      start,
      end,
      after:
        (response.aggregations?.datasets.after_key as {
          dataset: string;
        }) || after,
      prevResults: results,
    });
  }

  return results;
}

export async function getFailedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  types: DataStreamType[];
  datasetQuery?: string;
  start: number;
  end: number;
}): Promise<DataStreamDocsStat[]> {
  const { esClient, types, datasetQuery, start, end } = options;

  const datasetNames = datasetQuery
    ? [datasetQuery]
    : types.map((type) =>
        streamPartsToIndexPattern({
          typePattern: type,
          datasetPattern: '*-*',
        })
      );

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const datasets = await getPaginatedResults({
    datasetQualityESClient,
    index: datasetNames.join(','),
    start,
    end,
  });

  return Object.entries(datasets).map(([dataset, count]) => ({
    dataset,
    count,
  }));
}
