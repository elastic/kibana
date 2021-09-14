/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostTacticsItem, HostTacticsFields } from '../common';
import { CursorType, Hit, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { RequestOptionsPaginated } from '../..';
export interface HostTechniqueHit {
  key: string;
  doc_count: number;
  risk_score: {
    value?: number;
  };
}
export interface HostTacticsHit extends Hit {
  key: string;
  doc_count: number;
  risk_score: {
    value?: number;
  };
  technique: {
    buckets?: HostTechniqueHit[];
  };
  tactic_count: {
    value: number;
  };
}

export interface HostTacticsEdges {
  node: HostTacticsItem;
  cursor: CursorType;
}

export interface HostTacticsStrategyResponse extends IEsSearchResponse {
  edges: HostTacticsEdges[];
  techniqueCount: number;
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface HostTacticsRequestOptions extends RequestOptionsPaginated<HostTacticsFields> {
  defaultIndex: string[];
  hostName: string;
}

export type HostTacticsSortField = SortField<HostTacticsFields>;
