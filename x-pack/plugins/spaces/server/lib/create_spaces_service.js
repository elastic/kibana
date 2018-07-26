/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceUrlContext } from './spaces_url_parser';

export function createSpacesService(server) {

  const serverBasePath = server.config().get('server.basePath');

  const contextCache = new WeakMap();

  function getUrlContext(request) {
    if (!contextCache.has(request)) {
      populateCache(request);
    }

    const { urlContext } = contextCache.get(request);
    return urlContext;
  }

  function populateCache(request) {
    const urlContext = getSpaceUrlContext(request.getBasePath(), serverBasePath);

    contextCache.set(request, {
      urlContext
    });
  }

  return {
    getUrlContext,
  };
}
