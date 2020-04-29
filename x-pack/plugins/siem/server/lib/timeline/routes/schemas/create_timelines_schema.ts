/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

import { SavedTimelineRuntimeType } from '../../../../../common/types/timeline';
import { unionWithNullType } from '../../../../../common/utility_types';

export const createTimelineSchema = rt.intersection([
  rt.type({
    timeline: SavedTimelineRuntimeType,
  }),
  rt.partial({
    timelineId: unionWithNullType(rt.string),
    version: unionWithNullType(rt.string),
  }),
]);
