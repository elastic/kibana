/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, PageInfoPaginated } from '../../../common';
import { RequestOptionsPaginated } from '../..';
import { SortableUsersFields } from '../common';

export interface User {
  name: string;
  lastSeen: string;
  domain: string;
}

export interface UsersStrategyResponse extends IEsSearchResponse {
  users: User[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface UsersRequestOptions extends RequestOptionsPaginated<SortableUsersFields> {
  defaultIndex: string[];
}
