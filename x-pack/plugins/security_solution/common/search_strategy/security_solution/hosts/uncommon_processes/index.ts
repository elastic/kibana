/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { HostEcs } from '../../../../ecs/host';
import { UserEcs } from '../../../../ecs/user';
import { ProcessEcs } from '../../../../ecs/process';
import {
  RequestOptionsPaginated,
  SortField,
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  Hit,
  TotalHit,
  StringOrNumber,
  Hits,
} from '../../..';

export interface HostsUncommonProcessesRequestOptions extends RequestOptionsPaginated {
  sort: SortField;
  defaultIndex: string[];
}

export interface HostsUncommonProcessesStrategyResponse extends IEsSearchResponse {
  edges: HostsUncommonProcessesEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface HostsUncommonProcessesEdges {
  node: HostsUncommonProcessItem;
  cursor: CursorType;
}

export interface HostsUncommonProcessItem {
  _id: string;
  instances: number;
  process: ProcessEcs;
  hosts: HostEcs[];
  user?: Maybe<UserEcs>;
}

export interface HostsUncommonProcessHit extends Hit {
  total: TotalHit;
  host: Array<{
    id: string[] | undefined;
    name: string[] | undefined;
  }>;
  _source: {
    '@timestamp': string;
    process: ProcessEcs;
  };
  cursor: string;
  sort: StringOrNumber[];
}

export type ProcessHits = Hits<TotalHit, HostsUncommonProcessHit>;
