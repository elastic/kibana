/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AuthorizationsData,
  PaginationInput,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { ESQuery, Hit, SearchHit, TotalHit } from '../types';

export interface AuthorizationsAdapter {
  getAuthorizations(
    req: FrameworkRequest,
    options: AuthorizationsRequestOptions
  ): Promise<AuthorizationsData>;
}

export interface AuthorizationsRequestOptions {
  sourceConfiguration: SourceConfiguration;
  pagination: PaginationInput;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  fields: string[];
}

type StringOrNumber = string | number;
export interface AuthorizationHit extends Hit {
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

export interface AuthorizationBucket {
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
  authorization: {
    hits: {
      total: TotalHit;
      hits: ArrayLike<AuthorizationHit>;
    };
  };
}

export interface AuthorizationData extends SearchHit {
  sort: string[];
  aggregations: {
    process_count: {
      value: number;
    };
    group_by_process: {
      after_key: string;
      buckets: AuthorizationBucket[];
    };
  };
}
