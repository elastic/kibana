/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTE_URL } from '../../../../common/constants';
import { NoteSavedObject, SavedNote } from '../../../../common/types/timeline/note';
import { KibanaServices } from '../../../common/lib/kibana';

export const persistNote = async ({
  note,
  noteId,
  version,
  overrideOwner,
}: {
  note: SavedNote;
  noteId?: string | null;
  version?: string | null;
  overrideOwner?: boolean;
}) => {
  let requestBody;

  try {
    requestBody = JSON.stringify({ noteId, version, note, overrideOwner });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  const response = await KibanaServices.get().http.patch<NoteSavedObject[]>(NOTE_URL, {
    method: 'PATCH',
    body: requestBody,
  });
  return response;
};
