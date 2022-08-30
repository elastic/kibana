/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrameworkRequest } from '../../framework';
import * as savedObjectsToCreate from '../saved_object';
import type { SavedObjectTemplate } from '../types';

export const bulkCreateSavedObjects = async ({
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

  const savedObjects = JSON.stringify(savedObjectsToCreate[savedObjectTemplate]);

  if (savedObjects == null) {
    return new Error('Template not found.');
  }

  const replacedSO = spaceId ? savedObjects.replace(regex, spaceId) : savedObjects;
  const createSO = await savedObjectsClient.bulkCreate(JSON.parse(replacedSO), {
    overwrite: true,
  });

  return createSO;
};
