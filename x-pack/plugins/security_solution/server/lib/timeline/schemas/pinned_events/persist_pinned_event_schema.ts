/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';

export const persistPinnedEventSchema = rt.intersection([
  rt.type({
    eventId: rt.string,
  }),
  rt.partial({
    pinnedEventId: unionWithNullType(rt.string),
    timelineId: unionWithNullType(rt.string),
  }),
]);
