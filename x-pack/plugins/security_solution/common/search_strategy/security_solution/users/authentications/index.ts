/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { UserEcs } from '../../../../ecs/user';
import { SourceEcs } from '../../../../ecs/source';
import { HostEcs } from '../../../../ecs/host';
import {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  StringOrNumber,
  Hit,
  TotalHit,
} from '../../../common';
import { RequestOptionsPaginated } from '../..';

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

export interface AuthenticationBucket {
  key: string;
  doc_count: number;
  failures: {
    doc_count: number;
    // TODO: Keep this or make a new structure?
    value?: number;
  };
  successes: {
    doc_count: number;
    // TODO: Keep this or make a new structure?
    value?: number;
  };
  authentication: {
    hits: {
      total: TotalHit;
      hits: ArrayLike<AuthenticationHit>;
    };
  };
}
