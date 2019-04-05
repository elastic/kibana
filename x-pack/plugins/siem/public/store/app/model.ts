/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Note } from '../../lib/note';

export type ErrorState = ErrorModel;

export interface NotesById {
  [id: string]: Note;
}

export interface Error {
  id: string;
  title: string;
  message: string;
}

export type ErrorModel = Error[];

export interface AppModel {
  notesById: NotesById;
  errors: ErrorState;
}
