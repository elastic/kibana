/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';

import { unionWithNullType } from '../../../utility_types';

/*
 *  Note Types
 */
const SavedNoteRuntimeType = runtimeTypes.intersection([
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

/**
 * Note Saved object type with metadata
 */
export const SavedObjectNoteRuntimeType = runtimeTypes.intersection([
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
