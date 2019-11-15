/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_SPACE_ID } from '../constants';

export function getSpaceIdFromPath(
  requestBasePath: string = '/',
  serverBasePath: string = '/'
): string {
  let pathToCheck: string = requestBasePath;

  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    pathToCheck = requestBasePath.substr(serverBasePath.length);
  }
  // Look for `/s/space-url-context` in the base path
  const matchResult = pathToCheck.match(/^\/s\/([a-z0-9_\-]+)/);

  if (!matchResult || matchResult.length === 0) {
    return DEFAULT_SPACE_ID;
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, spaceId] = matchResult;

  if (!spaceId) {
    throw new Error(`Unable to determine Space ID from request path: ${requestBasePath}`);
  }

  return spaceId;
}

export function addSpaceIdToPath(
  basePath: string = '/',
  spaceId: string = '',
  requestedPath: string = ''
): string {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    return `${basePath}/s/${spaceId}${requestedPath}`;
  }
  return `${basePath}${requestedPath}`;
}
