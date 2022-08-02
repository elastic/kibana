/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { UserEcs } from '../../../../ecs/user';
import type { SourceEcs } from '../../../../ecs/source';
import type { HostEcs } from '../../../../ecs/host';
import type {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  StringOrNumber,
  Hit,
  TotalHit,
} from '../../../common';
import type { CommonFields, RequestOptionsPaginated } from '../..';

export interface UserAuthenticationsStrategyResponse extends IEsSearchResponse {
  edges: AuthenticationsEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface UserAuthenticationsRequestOptions extends RequestOptionsPaginated {
  defaultIndex: string[];
  stackByField: AuthStackByField;
}

export enum AuthStackByField {
  userName = 'user.name',
  hostName = 'host.name',
}

export interface AuthenticationsEdges {
  node: AuthenticationItem;
  cursor: CursorType;
}

export interface AuthenticationItem {
  _id: string;
  failures: number;
  successes: number;
  stackedValue: UserEcs['name'] | HostEcs['name'];
  lastSuccess?: Maybe<LastSourceHost>;
  lastFailure?: Maybe<LastSourceHost>;
}

export interface LastSourceHost {
  timestamp?: Maybe<string>;
  source?: Maybe<SourceEcs>;
  host?: Maybe<HostEcs>;
}

export interface AuthenticationHit extends Hit {
  fields: {
    '@timestamp': string;
    lastSuccess?: LastSourceHost;
    lastFailure?: LastSourceHost;
  };
  stackedValue: string;
  failures: number;
  successes: number;
  cursor?: string;
  sort: StringOrNumber[];
}

type AuthenticationFields = CommonFields &
  Partial<{
    [Property in keyof SourceEcs as `source.${Property}`]: unknown[];
  }> &
  Partial<{
    [Property in keyof HostEcs as `host.${Property}`]: unknown[];
  }>;

export interface AuthenticationBucket {
  key: string;
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
      hits: ArrayLike<AuthenticationFields>;
    };
  };
}
