/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PaginationInput,
  SourceConfiguration,
  TimerangeInput,
  UncommonProcessesData,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { ESQuery, SearchHit } from '../types';

export interface UncommonProcessesAdapter {
  getUncommonProcesses(
    req: FrameworkRequest,
    options: UncommonProcessesRequestOptions
  ): Promise<UncommonProcessesData>;
}

export interface UncommonProcessesRequestOptions {
  sourceConfiguration: SourceConfiguration;
  pagination: PaginationInput;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  fields: string[];
}

type StringOrNumber = string | number;
export interface UncommonProcessHit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
  total: number;
  hosts: string[];
  _source: {
    '@timestamp': string;
    process: {
      name: string;
      title: string;
    };
    host: {
      name: string;
    };
  };
  cursor: string;
  sort: StringOrNumber[];
}

export interface UncommonProcessBucket {
  key: string;
  hosts: {
    buckets: [];
  };
  process: {
    hits: {
      total: number;
      max_score: number | null;
      hits: UncommonProcessHit[];
    };
  };
}

export interface UncommonProcessData extends SearchHit {
  sort: string[];
  aggregations: {
    process_count: {
      value: number;
    };
    group_by_process: {
      after_key: string;
      buckets: UncommonProcessBucket[];
    };
  };
}
