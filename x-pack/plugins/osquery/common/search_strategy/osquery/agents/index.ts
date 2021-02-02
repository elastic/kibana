/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, PageInfoPaginated } from '../../common';
import { RequestOptionsPaginated } from '../..';
import { Agent } from '../../../shared_imports';

export interface AgentsStrategyResponse extends IEsSearchResponse {
  edges: Agent[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export type AgentsRequestOptions = RequestOptionsPaginated<{}>;
