/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../utility_types';

/*
 * Pinned Event Types
 * TODO: remove these when the timeline types are moved to zod
 */
const BarePinnedEventType = runtimeTypes.intersection([
  runtimeTypes.type({
    timelineId: runtimeTypes.string,
    eventId: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    created: unionWithNullType(runtimeTypes.number),
    createdBy: unionWithNullType(runtimeTypes.string),
    updated: unionWithNullType(runtimeTypes.number),
    updatedBy: unionWithNullType(runtimeTypes.string),
  }),
]);

export const PinnedEventRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    pinnedEventId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  BarePinnedEventType,
]);
