/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostEcs } from '../../../../ecs/host';
import { UserEcs } from '../../../../ecs/user';
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

export interface HostUncommonProcessesRequestOptions extends RequestOptionsPaginated {
  sort: SortField;
  defaultIndex: string[];
}

export interface HostUncommonProcessesStrategyResponse extends IEsSearchResponse {
  edges: UncommonProcessesEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface UncommonProcessesEdges {
  node: UncommonProcessItem;
  cursor: CursorType;
}

export interface UncommonProcessItem {
  _id: string;
  instances: number;
  process: ProcessEcsFields;
  hosts: HostEcs[];
  user?: Maybe<UserEcs>;
}

export interface ProcessEcsFields {
  hash?: Maybe<ProcessHashData>;
  pid?: Maybe<number[]>;
  name?: Maybe<string[]>;
  ppid?: Maybe<number[]>;
  args?: Maybe<string[]>;
  entity_id?: Maybe<string[]>;
  executable?: Maybe<string[]>;
  title?: Maybe<string[]>;
  thread?: Maybe<Thread>;
  working_directory?: Maybe<string[]>;
}

export interface ProcessHashData {
  md5?: Maybe<string[]>;
  sha1?: Maybe<string[]>;
  sha256?: Maybe<string[]>;
}

export interface Thread {
  id?: Maybe<number[]>;
  start?: Maybe<string[]>;
}

export interface UncommonProcessHit extends Hit {
  total: TotalHit;
  host: Array<{
    id: string[] | undefined;
    name: string[] | undefined;
  }>;
  _source: {
    '@timestamp': string;
    process: ProcessEcsFields;
  };
  cursor: string;
  sort: StringOrNumber[];
}

export type ProcessHits = Hits<TotalHit, UncommonProcessHit>;
