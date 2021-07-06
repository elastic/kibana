/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { RiskScoreItem, RiskScoreFields } from '../common';
import { CursorType, Hit, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export interface RiskScoreHit extends Hit {
  _source: {
    '@timestamp': string;
  };
  key: string;
  doc_count: number;
  risk_score: {
    value?: number;
  };
  risk_keyword: {
    buckets?: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface RiskScoreEdges {
  node: RiskScoreItem;
  cursor: CursorType;
}

export interface RiskScoreStrategyResponse extends IEsSearchResponse {
  edges: RiskScoreEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface RiskScoreRequestOptions extends RequestOptionsPaginated<RiskScoreFields> {
  defaultIndex: string[];
}

export type RiskScoreSortField = SortField<RiskScoreFields>;
