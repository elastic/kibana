/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SavedNoteRuntimeType } from '../../../../../common/types/timeline/note';
import { unionWithNullType } from '../../../../../common/utility_types';

export const persistNoteSchema = rt.intersection([
  rt.type({
    note: SavedNoteRuntimeType,
  }),
  rt.partial({
    overrideOwner: unionWithNullType(rt.boolean),
    noteId: unionWithNullType(rt.string),
    version: unionWithNullType(rt.string),
  }),
]);
