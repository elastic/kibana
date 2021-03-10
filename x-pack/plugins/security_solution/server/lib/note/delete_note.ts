/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FrameworkRequest } from '../framework';

export const deleteNote = async (request: FrameworkRequest, noteIds: string[]) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    noteIds.map((noteId) => savedObjectsClient.delete(noteSavedObjectType, noteId))
  );
};
