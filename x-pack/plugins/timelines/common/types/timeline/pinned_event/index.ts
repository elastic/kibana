/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';
import { Maybe } from '../../../search_strategy/common';

import { unionWithNullType } from '../../../utility_types';

/*
 *  Note Types
 */
export const SavedPinnedEventRuntimeType = runtimeTypes.intersection([
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

export interface SavedPinnedEvent extends runtimeTypes.TypeOf<typeof SavedPinnedEventRuntimeType> {}

/**
 * Note Saved object type with metadata
 */

export const PinnedEventSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedPinnedEventRuntimeType,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    pinnedEventId: unionWithNullType(runtimeTypes.string),
    timelineVersion: unionWithNullType(runtimeTypes.string),
  }),
]);

export const PinnedEventToReturnSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    pinnedEventId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  SavedPinnedEventRuntimeType,
  runtimeTypes.partial({
    timelineVersion: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface PinnedEventSavedObject
  extends runtimeTypes.TypeOf<typeof PinnedEventToReturnSavedObjectRuntimeType> {}

export interface PinnedEvent {
  code?: Maybe<number>;

  message?: Maybe<string>;

  pinnedEventId: string;

  eventId?: Maybe<string>;

  timelineId?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}
