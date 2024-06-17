/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Note } from '../../../common/api/timeline';

export interface NormalizedEntity<T> {
  entities: {
    [entity: string]: {
      [id: string]: T;
    };
  };
  result: string;
}

export interface NormalizedEntities<T> {
  entities: {
    [entity: string]: {
      [id: string]: T;
    };
  };
  result: string[];
}

export const normalizeEntity = (res: Note): NormalizedEntity<Note> => ({
  entities: {
    notes: {
      [res.noteId]: res,
    },
  },
  result: res.noteId,
});

export const normalizeEntities = (res: Note[]): NormalizedEntities<Note> => ({
  entities: {
    notes: res.reduce((obj, item) => Object.assign(obj, { [item.noteId]: item }), {}),
  },
  result: res.map((note) => note.noteId),
});
