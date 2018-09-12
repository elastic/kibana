/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from './errors';
import { getSpaceIdFromPath } from './spaces_url_parser';

export async function getActiveSpace(spacesClient, requestBasePath, serverBasePath) {
  const spaceId = getSpaceIdFromPath(requestBasePath, serverBasePath);

  try {
    return spacesClient.get(spaceId);
  }
  catch (e) {
    throw wrapError(e);
  }
}
