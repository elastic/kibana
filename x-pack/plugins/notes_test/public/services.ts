/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ResolvedSimpleSavedObject, SimpleSavedObject } from 'src/core/public';

import type { NoteAttributes } from '../common';
import { NOTE_OBJ_TYPE } from '../common';

export interface Services {
  createNote: (subject: string, text: string) => Promise<void>;
  findAllNotes: () => Promise<Array<SimpleSavedObject<NoteAttributes>>>;
  getNoteById: (id: string) => Promise<ResolvedSimpleSavedObject<NoteAttributes>>;
  addSuccessToast: (message: string) => void;
}

export function getServices(core: CoreStart): Services {
  const savedObjectsClient = core.savedObjects.client;

  return {
    createNote: async (subject: string, text: string) => {
      const attributes = { subject, text, createdAt: new Date() };
      await savedObjectsClient.create<NoteAttributes>(NOTE_OBJ_TYPE, attributes);
    },
    findAllNotes: async () => {
      const findResult = await savedObjectsClient.find<NoteAttributes>({
        type: NOTE_OBJ_TYPE,
        perPage: 100,
      });
      return findResult.savedObjects;
    },
    getNoteById: async (id: string) => {
      const resolveResult = await savedObjectsClient.resolve<NoteAttributes>(NOTE_OBJ_TYPE, id);
      return resolveResult;
    },
    addSuccessToast: (message: string) => core.notifications.toasts.addSuccess(message),
  };
}
