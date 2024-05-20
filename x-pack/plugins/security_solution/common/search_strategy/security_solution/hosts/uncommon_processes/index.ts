/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';

import type { HostEcs, ProcessEcs, UserEcs } from '@kbn/securitysolution-ecs';
import type {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  Hit,
  TotalHit,
  StringOrNumber,
  Hits,
  CommonFields,
} from '../../..';

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

type ProcessUserFields = CommonFields &
  Partial<{
    [Property in keyof ProcessEcs as `process.${Property}`]: unknown[];
  }> &
  Partial<{
    [Property in keyof UserEcs as `user.${Property}`]: unknown[];
  }>;

export interface HostsUncommonProcessHit extends Hit {
  total: TotalHit;
  host: Array<{
    id: string[] | undefined;
    name: string[] | undefined;
  }>;
  fields: ProcessUserFields;
  cursor: string;
  sort: StringOrNumber[];
}

export type ProcessHits = Hits<TotalHit, HostsUncommonProcessHit>;
