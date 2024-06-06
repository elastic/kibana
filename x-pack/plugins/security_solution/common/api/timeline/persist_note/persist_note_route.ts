/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../utility_types';
import { BareNoteSchema, BareNoteWithoutExternalRefsSchema } from '../model/api';

export const persistNoteWithRefSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    note: BareNoteSchema,
  }),
  runtimeTypes.partial({
    overrideOwner: unionWithNullType(runtimeTypes.boolean),
    noteId: unionWithNullType(runtimeTypes.string),
    version: unionWithNullType(runtimeTypes.string),
  }),
]);

export const persistNoteWithoutRefSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    note: BareNoteWithoutExternalRefsSchema,
  }),
  runtimeTypes.partial({
    overrideOwner: unionWithNullType(runtimeTypes.boolean),
    noteId: unionWithNullType(runtimeTypes.string),
    version: unionWithNullType(runtimeTypes.string),
    eventIngested: unionWithNullType(runtimeTypes.string),
    eventTimestamp: unionWithNullType(runtimeTypes.string),
    eventDataView: unionWithNullType(runtimeTypes.string),
  }),
]);

export const persistNoteSchema = runtimeTypes.union([
  persistNoteWithRefSchema,
  persistNoteWithoutRefSchema,
]);
