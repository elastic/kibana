/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getSpaceUrlContext(basePath = '/', defaultContext = '') {
  // Look for `/s/space-url-context` in the base path
  const matchResult = basePath.match(/\/s\/([a-z0-9\-]+)/);

  if (!matchResult || matchResult.length === 0) {
    return defaultContext;
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, urlContext = defaultContext] = matchResult;

  return urlContext;
}

export function stripSpaceUrlContext(basePath = '/') {
  const currentSpaceUrlContext = getSpaceUrlContext(basePath);

  let basePathWithoutSpace;
  if (currentSpaceUrlContext) {
    const indexOfSpaceContext = basePath.indexOf(`/s/${currentSpaceUrlContext}`);

    const startsWithSpace = indexOfSpaceContext === 0;

    if (startsWithSpace) {
      basePathWithoutSpace = '/';
    } else {
      basePathWithoutSpace = basePath.substring(0, indexOfSpaceContext);
    }
  } else {
    basePathWithoutSpace = basePath;
  }

  if (basePathWithoutSpace.endsWith('/')) {
    return basePathWithoutSpace.substr(0, -1);
  }

  return basePathWithoutSpace;
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
