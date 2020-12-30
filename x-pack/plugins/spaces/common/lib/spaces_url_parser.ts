/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_SPACE_ID } from '../constants';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

export function getSpaceIdFromPath(
  requestBasePath?: string | null,
  serverBasePath?: string | null
): { spaceId: string; pathHasExplicitSpaceIdentifier: boolean } {
  if (requestBasePath == null) requestBasePath = '/';
  if (serverBasePath == null) serverBasePath = '/';
  const pathToCheck: string = stripServerBasePath(requestBasePath, serverBasePath);

  // Look for `/s/space-url-context` in the base path
  const matchResult = pathToCheck.match(spaceContextRegex);

  if (!matchResult || matchResult.length === 0) {
    return {
      spaceId: DEFAULT_SPACE_ID,
      pathHasExplicitSpaceIdentifier: false,
    };
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, spaceId] = matchResult;

  if (!spaceId) {
    throw new Error(`Unable to determine Space ID from request path: ${requestBasePath}`);
  }

  return {
    spaceId,
    pathHasExplicitSpaceIdentifier: true,
  };
}

export function addSpaceIdToPath(
  basePath: string = '/',
  spaceId: string = '',
  requestedPath: string = ''
): string {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    return `${normalizedBasePath}/s/${spaceId}${requestedPath}`;
  }
  return `${normalizedBasePath}${requestedPath}` || '/';
}

function stripServerBasePath(requestBasePath: string, serverBasePath: string) {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.substr(serverBasePath.length);
  }
  return requestBasePath;
}
