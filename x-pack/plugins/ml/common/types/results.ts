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

export const defaultSearchQuery: estypes.QueryDslQueryContainer = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};
