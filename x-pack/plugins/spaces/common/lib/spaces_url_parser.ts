/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '../constants';

// Other base path contains the following:
// - the base path for the solution navigation (e.g. `/n/observability`)
const otherBasePathRegexStr = '/n/[a-z0-9_-]+';
const spaceRegexStr = '/s/([a-z0-9_-]+)';
const spaceContextRegex = new RegExp(`^(${otherBasePathRegexStr})?${spaceRegexStr}`);

/**
 * Extracts the space id from the given path.
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id.
 *
 * @private
 */
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

  // Ignoring first result and other known base paths, we only want the capture group result at index 1
  const [, , spaceId] = matchResult;

  if (!spaceId) {
    throw new Error(`Unable to determine Space ID from request path: ${requestBasePath}`);
  }

  return {
    spaceId,
    pathHasExplicitSpaceIdentifier: true,
  };
}

/**
 * Given a server base path, space id, and requested resource, this will construct a space-aware path
 * that includes a URL identifier with the space id.
 *
 * @param basePath the server's base path.
 * @param spaceId the space id.
 * @param requestedPath the requested path (e.g. `/app/dashboard`).
 * @returns the space-aware version of the requested path, inclusive of the server's base path.
 */
export function addSpaceIdToPath(
  basePath: string = '/',
  spaceId: string = '',
  requestedPath: string = ''
): string {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  const normalizedBasePath = stripSpaceIdFromPath(
    basePath.endsWith('/') ? basePath.slice(0, -1) : basePath,
    true
  );
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

export function stripSpaceIdFromPath(path: string, anywhere = false): string {
  if (anywhere) {
    return path.replace(new RegExp(spaceRegexStr), '');
  }
  return path.replace(spaceContextRegex, (match, p1, p2) => p1 || '');
}
