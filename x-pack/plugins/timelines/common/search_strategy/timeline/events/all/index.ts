/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import type { Ecs } from '../../../../ecs';
import type { CursorType, Inspect, Maybe, PaginationInputPaginated } from '../../../common';
import type { TimelineRequestOptionsPaginated } from '../..';

export interface TimelineEdges {
  node: TimelineItem;
  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;
  _index?: Maybe<string>;
  data: TimelineNonEcsData[];
  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

export interface TimelineEventsAllStrategyResponse extends IEsSearchResponse {
  edges: TimelineEdges[];
  totalCount: number;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  inspect?: Maybe<Inspect>;
}

export interface TimelineEventsAllRequestOptions extends TimelineRequestOptionsPaginated {
  fields: string[] | Array<{ field: string; include_unmapped: boolean }>;
  fieldRequested: string[];
  language: 'eql' | 'kuery' | 'lucene';
  excludeEcsData?: boolean;
}
