/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkRequest } from '../../../framework';
import { savedObjectsToCreate } from '../../../prebuilt_saved_objects/host_risk_score_dashboards';

export const createDashboards = async ({
  request,
  spaceId,
}: {
  request: FrameworkRequest;
  spaceId: string;
}) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  const regex = /<REPLACE-WITH-SPACE>/g;
  const savedObjects = JSON.stringify(savedObjectsToCreate);
  const replacedSO = savedObjects.replace(regex, spaceId);

  const createSO = await savedObjectsClient.bulkCreate(JSON.parse(replacedSO), {
    overwrite: true,
  });

  // Create new note
  return {
    code: 200,
    message: createSO,
  };
};
