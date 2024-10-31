/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

interface OpenNoteInExpandableFlyoutClickedParams {
  location: string;
}

interface AddNoteFromExpandableFlyoutClickedParams {
  isRelatedToATimeline: boolean;
}

export type NotesTelemetryEventParams =
  | OpenNoteInExpandableFlyoutClickedParams
  | AddNoteFromExpandableFlyoutClickedParams;

export enum NotesEventTypes {
  OpenNoteInExpandableFlyoutClicked = 'Open Note In Expandable Flyout Clicked',
  AddNoteFromExpandableFlyoutClicked = 'Add Note From Expandable Flyout Clicked',
}

export type NotesEventTypeData = {
  [K in NotesEventTypes]: K extends NotesEventTypes.OpenNoteInExpandableFlyoutClicked
    ? OpenNoteInExpandableFlyoutClickedParams
    : K extends NotesEventTypes.AddNoteFromExpandableFlyoutClicked
    ? AddNoteFromExpandableFlyoutClickedParams
    : never;
};

export type NotesTelemetryEvents =
  | {
      eventType: NotesEventTypes.OpenNoteInExpandableFlyoutClicked;
      schema: RootSchema<OpenNoteInExpandableFlyoutClickedParams>;
    }
  | {
      eventType: NotesEventTypes.AddNoteFromExpandableFlyoutClicked;
      schema: RootSchema<AddNoteFromExpandableFlyoutClickedParams>;
    };
