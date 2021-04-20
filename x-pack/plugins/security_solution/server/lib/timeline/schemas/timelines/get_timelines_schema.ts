/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  direction,
  sortFieldTimeline,
  TimelineStatusLiteralRt,
  TimelineTypeLiteralRt,
} from '../../../../../common/types/timeline';
import { unionWithNullType } from '../../../../../common/utility_types';

const BoolFromString = rt.union([rt.literal('true'), rt.literal('false')]);

export const getTimelinesQuerySchema = rt.partial({
  only_user_favorite: unionWithNullType(BoolFromString),
  page_index: unionWithNullType(rt.string),
  page_size: unionWithNullType(rt.string),
  search: unionWithNullType(rt.string),
  sort_field: sortFieldTimeline,
  sort_order: direction,
  status: unionWithNullType(TimelineStatusLiteralRt),
  timeline_type: unionWithNullType(TimelineTypeLiteralRt),
});

export const getTimelinesArgsSchema = rt.partial({
  onlyUserFavorite: unionWithNullType(BoolFromString),
  pageIndex: unionWithNullType(rt.string),
  pageSize: unionWithNullType(rt.string),
  search: unionWithNullType(rt.string),
  sortField: sortFieldTimeline,
  sortOrder: direction,
  status: unionWithNullType(TimelineStatusLiteralRt),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
});

export type GetTimelinesArgs = rt.TypeOf<typeof getTimelinesQuerySchema>;
