/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';

import { unionWithNullType } from '../../../utility_types';

/*
 *  Note Types
 */
export const SavedNoteRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    timelineId: unionWithNullType(runtimeTypes.string),
  }),
  runtimeTypes.partial({
    eventId: unionWithNullType(runtimeTypes.string),
    note: unionWithNullType(runtimeTypes.string),
    created: unionWithNullType(runtimeTypes.number),
    createdBy: unionWithNullType(runtimeTypes.string),
    updated: unionWithNullType(runtimeTypes.number),
    updatedBy: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface SavedNote extends runtimeTypes.TypeOf<typeof SavedNoteRuntimeType> {}

/**
 * Note Saved object type with metadata
 */

export const NoteSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedNoteRuntimeType,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    noteId: runtimeTypes.string,
    timelineVersion: runtimeTypes.union([
      runtimeTypes.string,
      runtimeTypes.null,
      runtimeTypes.undefined,
    ]),
  }),
]);

export const NoteSavedObjectToReturnRuntimeType = runtimeTypes.intersection([
  SavedNoteRuntimeType,
  runtimeTypes.type({
    noteId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    timelineVersion: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface NoteSavedObject
  extends runtimeTypes.TypeOf<typeof NoteSavedObjectToReturnRuntimeType> {}
