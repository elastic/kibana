/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkRequest } from '../../framework';
import * as savedObjectsToCreate from '../prebuilt_templates';

export const bulkCreateSavedObjects = async ({
  request,
  spaceId,
  savedObjectTemplate,
}: {
  request: FrameworkRequest;
  spaceId?: string;
  savedObjectTemplate: string;
}) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  const regex = /<REPLACE-WITH-SPACE>/g;
  const savedObjects = JSON.stringify(savedObjectsToCreate[savedObjectTemplate]);
  const replacedSO = spaceId ? savedObjects.replace(regex, spaceId) : savedObjects;

  const createSO = await savedObjectsClient.bulkCreate(JSON.parse(replacedSO), {
    overwrite: true,
  });

  return {
    code: 200,
    message: createSO,
  };
};
