/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { Inspect, Maybe, PageInfoPaginated } from '../../../common';
import type { RequestOptionsPaginated } from '../..';
import type { SortableUsersFields } from '../common';
import type { RiskSeverity } from '../../risk_score';

export interface User {
  name: string;
  lastSeen: string;
  domain: string;
  risk?: RiskSeverity;
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
