/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';

export const pinnedEventIds = unionWithNullType(runtimeTypes.array(runtimeTypes.string));
export const persistPinnedEventSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    eventId: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    pinnedEventId: unionWithNullType(runtimeTypes.string),
    timelineId: unionWithNullType(runtimeTypes.string),
  }),
]);
