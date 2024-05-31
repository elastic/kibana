/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../utility_types';

export const pinnedEventIds = unionWithNullType(runtimeTypes.array(runtimeTypes.string));
export const persistPinnedEventSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    eventId: runtimeTypes.string,
    timelineId: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    pinnedEventId: unionWithNullType(runtimeTypes.string),
  }),
]);

/*
 *  Note Types
 */
export const BarePinnedEventType = runtimeTypes.intersection([
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

export interface BarePinnedEvent extends runtimeTypes.TypeOf<typeof BarePinnedEventType> {}

/**
 * This type represents a pinned event type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type BarePinnedEventWithoutExternalRefs = Omit<BarePinnedEvent, 'timelineId'>;

export const PinnedEventRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    pinnedEventId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  BarePinnedEventType,
]);

export interface PinnedEvent extends runtimeTypes.TypeOf<typeof PinnedEventRuntimeType> {}

export type PinnedEventResponse = PinnedEvent & { code: number; message?: string };
