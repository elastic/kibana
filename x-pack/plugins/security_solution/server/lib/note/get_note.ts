/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkRequest } from '../framework';
import { convertSavedObjectToSavedNote } from './helpers';
import { noteSavedObjectType } from './saved_object_mappings';

export const getNote = async (request: FrameworkRequest, NoteId: string) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObject = await savedObjectsClient.get(noteSavedObjectType, NoteId);

  return convertSavedObjectToSavedNote(savedObject);
};
