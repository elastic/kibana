/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrameworkRequest } from '../../../framework';

export const deleteSearchByTimelineId = async (
  request: FrameworkRequest,
  savedSearchIds?: string[]
) => {
  if (savedSearchIds !== undefined) {
    const savedObjectsClient = (await request.context.core).savedObjects.client;
    const objects = savedSearchIds.map((id) => ({ id, type: 'search' }));

    await savedObjectsClient.bulkDelete(objects);
  } else {
    return Promise.resolve();
  }
};
