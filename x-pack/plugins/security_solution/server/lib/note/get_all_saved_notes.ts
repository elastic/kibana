/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FrameworkRequest } from '../framework';
import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { convertSavedObjectToSavedNote } from './saved_object';

export const getAllSavedNotes = async (
  request: FrameworkRequest,
  options: SavedObjectsFindOptions
) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObjects = await savedObjectsClient.find(options);

  return {
    totalCount: savedObjects.total,
    notes: savedObjects.saved_objects.map((savedObject) =>
      convertSavedObjectToSavedNote(savedObject)
    ),
  };
};
