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

const SIZE_LIMIT = 10000;

export async function getDegradedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  start: number;
  end: number;
  datasetQuery?: string;
  after?: {
    degradedDocs?: { dataset: string; namespace: string };
    docsCount?: { dataset: string; namespace: string };
  };
  prevResults?: { degradedDocs: ResultBucket[]; docsCount: ResultBucket[] };
}): Promise<DegradedDocs[]> {
  const {
    esClient,
    type = DEFAULT_DATASET_TYPE,
    datasetQuery,
    start,
    end,
    after,
    prevResults = { degradedDocs: [], docsCount: [] },
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
        size: SIZE_LIMIT,
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
      aggs: aggs(after?.docsCount),
    },
  ]);
  const [degradedDocsResponse, totalDocsResponse] = response.responses;

  const currDegradedDocs =
    degradedDocsResponse.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const degradedDocs = [...prevResults.degradedDocs, ...currDegradedDocs];

  const currTotalDocs =
    totalDocsResponse.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: `${type}-${bucket.key.dataset}-${bucket.key.namespace}`,
      count: bucket.doc_count,
    })) ?? [];

  const docsCount = [...prevResults.docsCount, ...currTotalDocs];

  if (
    totalDocsResponse.aggregations?.datasets.after_key &&
    totalDocsResponse.aggregations?.datasets.buckets.length === SIZE_LIMIT
  ) {
    return getDegradedDocsPaginated({
      esClient,
      type,
      start,
      end,
      datasetQuery,
      after: {
        degradedDocs:
          (degradedDocsResponse.aggregations?.datasets.after_key as {
            dataset: string;
            namespace: string;
          }) || after?.degradedDocs,
        docsCount:
          (totalDocsResponse.aggregations?.datasets.after_key as {
            dataset: string;
            namespace: string;
          }) || after?.docsCount,
      },
      prevResults: { degradedDocs, docsCount },
    });
  }

  const degradedDocsMap = degradedDocs.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.dataset]: curr.count,
    }),
    {}
  );

  return docsCount.map((curr) => {
    const degradedDocsCount = degradedDocsMap[curr.dataset as keyof typeof degradedDocsMap] || 0;

    return {
      ...curr,
      docsCount: curr.count,
      count: degradedDocsCount,
      percentage: (degradedDocsCount / curr.count) * 100,
    };
  });
}
