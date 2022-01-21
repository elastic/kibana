/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { RiskScoreBetterItem, RiskScoreBetterFields } from '../common';
import { CursorType, Hit, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export interface RiskScoreBetterHit extends Hit {
  _source: {
    '@timestamp': string;
  };
  key: string;
  doc_count: number;
  risk_score: {
    value?: number;
  };
  risk: {
    buckets?: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface RiskScoreBetterEdges {
  node: RiskScoreBetterItem;
  cursor: CursorType;
}

export interface RiskScoreBetterStrategyResponse extends IEsSearchResponse {
  edges: RiskScoreBetterEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export type RiskScoreBetterSortField = SortField<RiskScoreBetterFields>;

export interface RiskScoreBetterRequestOptions
  extends RequestOptionsPaginated<RiskScoreBetterFields> {
  defaultIndex: string[];
}
