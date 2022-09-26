/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';
import type { Maybe } from '../../../search_strategy/common';
import { Direction } from '../../../search_strategy/common';

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
 * This type represents a note type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type NoteWithoutExternalRefs = Omit<SavedNote, 'timelineId'>;

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

export enum SortFieldNote {
  updatedBy = 'updatedBy',
  updated = 'updated',
}

export const pageInfoNoteRt = runtimeTypes.type({
  pageIndex: runtimeTypes.number,
  pageSize: runtimeTypes.number,
});

export type PageInfoNote = runtimeTypes.TypeOf<typeof pageInfoNoteRt>;

export const sortNoteRt = runtimeTypes.type({
  sortField: runtimeTypes.union([
    runtimeTypes.literal(SortFieldNote.updatedBy),
    runtimeTypes.literal(SortFieldNote.updated),
  ]),
  sortOrder: runtimeTypes.union([
    runtimeTypes.literal(Direction.asc),
    runtimeTypes.literal(Direction.desc),
  ]),
});

export type SortNote = runtimeTypes.TypeOf<typeof sortNoteRt>;

export interface NoteResult {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;

  noteId: string;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface ResponseNotes {
  notes: NoteResult[];

  totalCount?: Maybe<number>;
}

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: NoteResult;
}
