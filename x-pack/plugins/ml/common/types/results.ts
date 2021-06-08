/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export interface GetStoppedPartitionResult {
  jobs: string[] | Record<string, string[]>;
}
export interface GetDatafeedResultsChartDataResult {
  bucketResults: number[][];
  datafeedResults: number[][];
}

export interface DatafeedResultsChartDataParams {
  jobId: string;
  start: number;
  end: number;
}

type MLSearchResp = Omit<estypes.SearchResponse, 'aggregations'>;

interface AggResult {
  key_as_string: string;
  key: number;
  doc_count: number;
}
export interface MLAggSearchResp extends MLSearchResp {
  aggregations: {
    doc_count_by_bucket_span: {
      buckets: AggResult[];
    };
  };
}

export const defaultSearchQuery: estypes.QueryContainer = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};
