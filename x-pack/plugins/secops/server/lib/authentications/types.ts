/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AuthenticationsData,
  PaginationInput,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { ESQuery, Hit, SearchHit, TotalHit } from '../types';

export interface AuthenticationsAdapter {
  getAuthentications(
    req: FrameworkRequest,
    options: AuthenticationsRequestOptions
  ): Promise<AuthenticationsData>;
}

export interface AuthenticationsRequestOptions {
  sourceConfiguration: SourceConfiguration;
  pagination: PaginationInput;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  fields: string[];
}

type StringOrNumber = string | number;
export interface AuthenticationHit extends Hit {
  _source: {
    '@timestamp': string;
    source: {
      ip: string;
    };
    host: {
      id: string;
      ip: string;
      name: string;
    };
  };
  user: string;
  failures: number;
  successes: number;
  cursor?: string;
  sort: StringOrNumber[];
}

export interface AuthenticationBucket {
  key: {
    user_uid: string;
  };
  doc_count: number;
  failures: {
    doc_count: number;
  };
  successes: {
    doc_count: number;
  };
  authentication: {
    hits: {
      total: TotalHit;
      hits: ArrayLike<AuthenticationHit>;
    };
  };
}

export interface AuthenticationData extends SearchHit {
  sort: string[];
  aggregations: {
    process_count: {
      value: number;
    };
    group_by_process: {
      after_key: string;
      buckets: AuthenticationBucket[];
    };
  };
}
