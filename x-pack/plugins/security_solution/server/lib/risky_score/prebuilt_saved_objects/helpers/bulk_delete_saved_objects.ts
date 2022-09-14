/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { FrameworkRequest } from '../../../framework';
import * as savedObjectsToCreate from '../saved_object';
import type { SavedObjectTemplate } from '../types';

const deleteSavedObject = async ({
  savedObjectsClient,
  options: { type, id },
}: {
  savedObjectsClient: SavedObjectsClientContract;
  options: { type: string; id: string };
}) => {
  try {
    await savedObjectsClient.get(type, id);
    await savedObjectsClient.delete(type, id);
    return id;
  } catch (e) {
    return new Error(`Unable to delete ${id}`);
  }
};

export const bulkDeleteSavedObjects = async ({
  request,
  spaceId,
  savedObjectTemplate,
}: {
  request: FrameworkRequest;
  spaceId?: string;
  savedObjectTemplate: SavedObjectTemplate;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const regex = /<REPLACE-WITH-SPACE>/g;

  const savedObjects = savedObjectsToCreate[savedObjectTemplate];

  if (savedObjects == null) {
    return new Error('Template not found.');
  }

  const result = await Promise.all(
    savedObjects.map((so) => {
      const id = spaceId ? so.id.replace(regex, spaceId) : so.id;

      deleteSavedObject({ savedObjectsClient, options: { type: so.type, id } });
      return id;
    })
  );

  return result;
};
