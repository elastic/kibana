/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostRulesItem, HostRulesFields } from '../common';
import { CursorType, Hit, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export interface HostRulesHit extends Hit {
  key: string;
  doc_count: number;
  risk_score: {
    value?: number;
  };
  rule_type: {
    buckets?: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  rule_count: {
    value: number;
  };
}

export interface HostRulesEdges {
  node: HostRulesItem;
  cursor: CursorType;
}

export interface HostRulesStrategyResponse extends IEsSearchResponse {
  edges: HostRulesEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface HostRulesRequestOptions extends RequestOptionsPaginated<HostRulesFields> {
  defaultIndex: string[];
  hostName: string;
}

export type HostRulesSortField = SortField<HostRulesFields>;
