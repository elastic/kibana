/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import {
  CursorType,
  Inspect,
  Hit,
  Maybe,
  PageInfoPaginated,
  RequestOptionsPaginated,
  SearchHit,
  SourceConfiguration,
  TotalHit,
} from '..';

export enum AuthenticationsQuery {
  authentications = 'authentications',
}

export interface AuthenticationsStrategyResponse extends IEsSearchResponse {
  edges: AuthenticationsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface AuthenticationsRequestOptions extends RequestOptionsPaginated {
  fields: readonly string[];
  sourceConfiguration: SourceConfiguration;
}

export interface AuthenticationsEdges {
  node: AuthenticationItem;

  cursor: CursorType;
}

export interface AuthenticationItem {
  _id: string;

  failures: number;

  successes: number;

  user: UserEcsFields;

  lastSuccess?: Maybe<LastSourceHost>;

  lastFailure?: Maybe<LastSourceHost>;
}

export interface UserEcsFields {
  domain?: Maybe<string[] | string>;

  id?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  full_name?: Maybe<string[] | string>;

  email?: Maybe<string[] | string>;

  hash?: Maybe<string[] | string>;

  group?: Maybe<string[] | string>;
}

export interface LastSourceHost {
  timestamp?: Maybe<string>;

  source?: Maybe<SourceEcsFields>;

  host?: Maybe<HostEcsFields>;
}

export interface SourceEcsFields {
  bytes?: Maybe<number[] | number>;

  ip?: Maybe<string[] | string>;

  port?: Maybe<number[] | number>;

  domain?: Maybe<string[] | string>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[] | number>;
}

export interface GeoEcsFields {
  city_name?: Maybe<string[] | string>;

  continent_name?: Maybe<string[] | string>;

  country_iso_code?: Maybe<string[] | string>;

  country_name?: Maybe<string[] | string>;

  location?: Maybe<Location>;

  region_iso_code?: Maybe<string[] | string>;

  region_name?: Maybe<string[] | string>;
}

export interface Location {
  lon?: Maybe<number[] | number>;

  lat?: Maybe<number[] | number>;
}

export interface HostEcsFields {
  architecture?: Maybe<string[] | string>;

  id?: Maybe<string[] | string>;

  ip?: Maybe<string[] | string>;

  mac?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  os?: Maybe<OsEcsFields>;

  type?: Maybe<string[] | string>;
}

export interface OsEcsFields {
  platform?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  full?: Maybe<string[] | string>;

  family?: Maybe<string[] | string>;

  version?: Maybe<string[] | string>;

  kernel?: Maybe<string[] | string>;
}

export interface AuthenticationHit extends Hit {
  _source: {
    '@timestamp': string;
    lastSuccess?: LastSourceHost;
    lastFailure?: LastSourceHost;
  };
  user: string;
  failures: number;
  successes: number;
  cursor?: string;
  sort: StringOrNumber[];
}

type StringOrNumber = string | number;

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
