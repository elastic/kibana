/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { SavedTimelineRuntimeType } from '../../../../../common/types/timeline';
import { unionWithNullType } from '../../../../../common/utility_types';

export const patchTimelineSchema = rt.type({
  timeline: SavedTimelineRuntimeType,
  timelineId: unionWithNullType(rt.string),
  version: unionWithNullType(rt.string),
});
