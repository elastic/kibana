/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceUrlContext } from '../../common/spaces_url_parser';

export function createSpacesService() {

  const contextCache = new WeakMap();

  function getUrlContext(request, defaultContext = null) {
    if (!contextCache.has(request)) {
      populateCache(request, defaultContext);
    }

    const { urlContext } = contextCache.get(request);
    return urlContext;
  }

  function populateCache(request, defaultContext) {
    const urlContext = getSpaceUrlContext(request.getBasePath(), defaultContext);

    contextCache.set(request, {
      urlContext
    });
  }

  return {
    getUrlContext,
  };
}
