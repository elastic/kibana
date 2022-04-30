/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../../../../src/plugins/data/common';
import { EqlSearchResponse, Inspect, Maybe, PaginationInputPaginated } from '../../..';
import { TimelineEdges, TimelineEventsAllRequestOptions } from '../..';

export interface TimelineEqlRequestOptions
  extends EqlSearchStrategyRequest,
    Omit<TimelineEventsAllRequestOptions, 'params'> {
  eventCategoryField?: string;
  tiebreakerField?: string;
  timestampField?: string;
  size?: number;
}

export interface TimelineEqlResponse extends EqlSearchStrategyResponse<EqlSearchResponse<unknown>> {
  edges: TimelineEdges[];
  totalCount: number;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  inspect: Maybe<Inspect>;
}

export interface EqlOptionsData {
  keywordFields: EuiComboBoxOptionOption[];
  dateFields: EuiComboBoxOptionOption[];
  nonDateFields: EuiComboBoxOptionOption[];
}

export interface EqlOptionsSelected {
  eventCategoryField?: string;
  tiebreakerField?: string;
  timestampField?: string;
  query?: string;
  size?: number;
}

export type FieldsEqlOptions = keyof EqlOptionsSelected;
