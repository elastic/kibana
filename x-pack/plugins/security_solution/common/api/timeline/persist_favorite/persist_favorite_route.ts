/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { TimelineTypeLiteralRt } from '../model/api';
import { unionWithNullType } from '../../../utility_types';

export const persistFavoriteSchema = rt.type({
  timelineId: unionWithNullType(rt.string),
  templateTimelineId: unionWithNullType(rt.string),
  templateTimelineVersion: unionWithNullType(rt.number),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
});
