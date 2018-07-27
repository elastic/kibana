/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceIdFromPath } from './spaces_url_parser';

export function createSpacesService(server) {

  const serverBasePath = server.config().get('server.basePath');

  const contextCache = new WeakMap();

  function getSpaceId(request) {
    if (!contextCache.has(request)) {
      populateCache(request);
    }

    const { spaceId } = contextCache.get(request);
    return spaceId;
  }

  function populateCache(request) {
    const spaceId = getSpaceIdFromPath(request.getBasePath(), serverBasePath);

    contextCache.set(request, {
      spaceId
    });
  }

  return {
    getSpaceId,
  };
}
