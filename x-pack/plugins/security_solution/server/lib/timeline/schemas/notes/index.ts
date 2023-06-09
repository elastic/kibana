/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';
import { SavedNoteRuntimeType } from '../../../../../common/types/timeline/note';

export const eventNotes = unionWithNullType(runtimeTypes.array(SavedNoteRuntimeType));
export const globalNotes = unionWithNullType(runtimeTypes.array(SavedNoteRuntimeType));

export const persistNoteSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    note: SavedNoteRuntimeType,
  }),
  runtimeTypes.partial({
    overrideOwner: unionWithNullType(runtimeTypes.boolean),
    noteId: unionWithNullType(runtimeTypes.string),
    version: unionWithNullType(runtimeTypes.string),
  }),
]);

export const deleteNoteSchema = runtimeTypes.partial({
  noteId: unionWithNullType(runtimeTypes.string),
});
