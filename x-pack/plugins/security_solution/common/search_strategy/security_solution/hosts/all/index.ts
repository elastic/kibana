/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostItem, HostsFields } from '../common';
import { CursorType, Direction, Inspect, Maybe, PageInfoPaginated } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export interface HostsEdges {
  node: HostItem;
  cursor: CursorType;
}

export interface HostsStrategyResponse extends IEsSearchResponse {
  edges: HostsEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface HostsRequestOptions extends RequestOptionsPaginated<HostsFields> {
  defaultIndex: string[];
}

export interface HostsSortField {
  field: HostsFields;

  direction: Direction;
}
