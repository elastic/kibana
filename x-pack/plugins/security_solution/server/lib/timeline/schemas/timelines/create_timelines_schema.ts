/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import {
  SavedTimelineRuntimeType,
  TimelineStatusLiteralRt,
  TimelineTypeLiteralRt,
} from '../../../../../common/types/timeline';
import { unionWithNullType } from '../../../../../common/utility_types';

export const createTimelineSchema = rt.intersection([
  rt.type({
    timeline: SavedTimelineRuntimeType,
  }),
  rt.partial({
    status: unionWithNullType(TimelineStatusLiteralRt),
    timelineId: unionWithNullType(rt.string),
    templateTimelineId: unionWithNullType(rt.string),
    templateTimelineVersion: unionWithNullType(rt.number),
    timelineType: unionWithNullType(TimelineTypeLiteralRt),
    version: unionWithNullType(rt.string),
  }),
]);

export type CreateTimelineSchema = rt.TypeOf<typeof createTimelineSchema>;
