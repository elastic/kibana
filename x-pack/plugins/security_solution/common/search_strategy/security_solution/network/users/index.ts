/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { CursorType, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { FlowTarget } from '../common';
import { RequestOptionsPaginated } from '../..';

export enum NetworkUsersFields {
  name = 'name',
  count = 'count',
}

export interface NetworkUsersRequestOptions extends RequestOptionsPaginated {
  ip: string;
  sort: SortField<NetworkUsersFields>;
  flowTarget: FlowTarget;
}

export interface NetworkUsersStrategyResponse extends IEsSearchResponse {
  edges: NetworkUsersEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface NetworkUsersEdges {
  node: NetworkUsersNode;
  cursor: CursorType;
}

export interface NetworkUsersNode {
  _id?: Maybe<string>;
  timestamp?: Maybe<string>;
  user?: Maybe<NetworkUsersItem>;
}

export interface NetworkUsersItem {
  name?: Maybe<string>;
  id?: Maybe<string[]>;
  groupId?: Maybe<string[]>;
  groupName?: Maybe<string[]>;
  count?: Maybe<number>;
}

export interface NetworkUsersBucketsItem {
  key: string;
  doc_count: number;
  groupName?: NetworkUsersGroupName;
  groupId?: NetworkUsersGroupId;
  id?: Id;
}

export interface NetworkUsersGroupName {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: NetworkUsersBucketsItem[];
}

export interface NetworkUsersGroupId {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: NetworkUsersBucketsItem[];
}

interface Id {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: NetworkUsersBucketsItem[];
}
