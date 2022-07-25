/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';
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
  consumers: Record<string, number>;
  edges: TimelineEdges[];
  totalCount: number;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  inspect?: Maybe<Inspect>;
}

export interface TimelineEventsAllRequestOptions extends TimelineRequestOptionsPaginated {
  authFilter?: JsonObject;
  excludeEcsData?: boolean;
  fieldRequested: string[];
  fields: string[] | Array<{ field: string; include_unmapped: boolean }>;
  language: 'eql' | 'kuery' | 'lucene';
  runtimeMappings: MappingRuntimeFields;
}
