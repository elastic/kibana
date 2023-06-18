/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';
import type { Maybe } from '../../../search_strategy/common';

import { unionWithNullType } from '../../../utility_types';

export const BareNoteSchema = runtimeTypes.intersection([
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

export interface BareNote extends runtimeTypes.TypeOf<typeof BareNoteSchema> {}

/**
 * This type represents a note type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type BareNoteWithoutExternalRefs = Omit<BareNote, 'timelineId'>;

export const NoteRuntimeType = runtimeTypes.intersection([
  BareNoteSchema,
  runtimeTypes.type({
    noteId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    timelineVersion: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface Note extends runtimeTypes.TypeOf<typeof NoteRuntimeType> {}

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: Note;
}
