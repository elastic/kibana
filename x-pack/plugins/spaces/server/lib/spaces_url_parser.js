/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getSpaceUrlContext(requestBasePath = '/', serverBasePath = '/') {
  let pathToCheck = requestBasePath;

  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    pathToCheck = requestBasePath.substr(serverBasePath.length);
  }
  // Look for `/s/space-url-context` in the base path
  const matchResult = pathToCheck.match(/^\/s\/([a-z0-9\-]+)/);

  if (!matchResult || matchResult.length === 0) {
    return '';
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, urlContext = ''] = matchResult;

  return urlContext;
}

export function addSpaceUrlContext(basePath = '/', urlContext = '', requestedPath = '') {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  if (urlContext) {
    return `${basePath}/s/${urlContext}${requestedPath}`;
  }
  return `${basePath}${requestedPath}`;
}
