/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceUrlContext } from '../../common/spaces_url_parser';

export function createSpacesService() {

  const contextCache = new WeakMap();

  function getUrlContext(request) {
    if (!contextCache.has(request)) {
      populateCache(request);
    }

    const { urlContext } = contextCache.get(request);
    return urlContext;
  }

  async function getSpaceId(request) {
    if (!contextCache.has(request)) {
      await populateCache(request);
    }

    const { spaceId } = contextCache.get(request);
    return spaceId;
  }

  function populateCache(request) {
    const urlContext = getSpaceUrlContext(request.getBasePath());
    const spaceId = 'TODO';

    contextCache.set(request, {
      urlContext,
      spaceId
    });
  }

  return {
    getUrlContext,
    getSpaceId,
  };
}
