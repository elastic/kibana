/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { ImportTimelinesSchemaRt, TimelineSavedToReturnObjectRuntimeType } from '..';
import { unionWithNullType } from '../../../utility_types';

export const checkTimelineStatusRt = rt.type({
  timelinesToInstall: rt.array(unionWithNullType(ImportTimelinesSchemaRt)),
  timelinesToUpdate: rt.array(unionWithNullType(ImportTimelinesSchemaRt)),
  prepackagedTimelines: rt.array(unionWithNullType(TimelineSavedToReturnObjectRuntimeType)),
});

export type CheckTimelineStatusRt = rt.TypeOf<typeof checkTimelineStatusRt>;
