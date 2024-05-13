/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { DataStreamType } from '../../../common/types';
import { DegradedDocs } from '../../../common/api_types';
import {
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  DATA_STREAM_TYPE,
  _IGNORED,
} from '../../../common/es_fields';
import { createDatasetQualityESClient, wildcardQuery } from '../../utils';

interface ResultBucket {
  dataset: string;
  count: number;
}

export async function getDegradedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  start: number;
  end: number;
  datasetQuery?: string;
  after?: {
    degradedDocs?: { dataset: string; namespace: string };
    totalDocs?: { dataset: string; namespace: string };
  };
  prevResults?: { degradedDocs: ResultBucket[]; totalDocs: ResultBucket[] };
}): Promise<DegradedDocs[]> {
  const {
    esClient,
    type = DEFAULT_DATASET_TYPE,
    datasetQuery,
    start,
    end,
    after,
    prevResults = { degradedDocs: [], totalDocs: [] },
  } = options;

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const datasetFilter = {
    ...(datasetQuery
      ? {
          should: [
            ...wildcardQuery(DATA_STREAM_DATASET, datasetQuery),
            ...wildcardQuery(DATA_STREAM_NAMESPACE, datasetQuery),
          ],
          minimum_should_match: 1,
        }
      : {}),
  };

  const otherFilters = [...rangeQuery(start, end), ...termQuery(DATA_STREAM_TYPE, type)];

  const aggs = (afterKey?: { dataset: string; namespace: string }) => ({
    datasets: {
      composite: {
        ...(afterKey ? { after: afterKey } : {}),
        size: 10000,
        sources: [
          { dataset: { terms: { field: 'data_stream.dataset' } } },
          { namespace: { terms: { field: 'data_stream.namespace' } } },
        ],
      },
    },
  });

  const response = await datasetQualityESClient.msearch({ index: `${type}-*` }, [
    // degraded docs per dataset
    {
      size: 0,
      query: {
        bool: {
          ...datasetFilter,
          filter: otherFilters,
          must: { exists: { field: _IGNORED } },
        },
      },
      aggs: aggs(after?.degradedDocs),
    },
    // total docs per dataset
    {
      size: 0,
      query: {
        bool: {
          ...datasetFilter,
          filter: otherFilters,
        },
      },
      aggs: aggs(after?.totalDocs),
    },
  ]);

  const currDegradedDocs =
    response.responses[0].aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const degradedDocs = [...prevResults.degradedDocs, ...currDegradedDocs];

  const currTotalDocs =
    response.responses[1].aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const totalDocs = [...prevResults.totalDocs, ...currTotalDocs];

  if (
    response.responses[0].aggregations?.datasets.after_key ||
    response.responses[1].aggregations?.datasets.after_key
  ) {
    return getDegradedDocsPaginated({
      esClient,
      type,
      start,
      end,
      datasetQuery,
      after: {
        degradedDocs:
          (response.responses[0].aggregations?.datasets.after_key as {
            dataset: string;
            namespace: string;
          }) || after?.degradedDocs,
        totalDocs:
          (response.responses[1].aggregations?.datasets.after_key as {
            dataset: string;
            namespace: string;
          }) || after?.totalDocs,
      },
      prevResults: { degradedDocs, totalDocs },
    });
  }

  const degradedDocsMap = degradedDocs.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.dataset]: curr.count,
    }),
    {}
  );

  return totalDocs.map((curr) => {
    const degradedDocsCount = degradedDocsMap[curr.dataset as keyof typeof degradedDocsMap] || 0;

    return {
      ...curr,
      totalDocs: curr.count,
      count: degradedDocsCount,
      percentage: (degradedDocsCount / curr.count) * 100,
    };
  });
}
