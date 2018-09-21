/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../../common/model/space';
import { getActiveSpace as getActiveSpaceFromRequest } from './get_active_space';
import { getSpaceIdFromPath } from './spaces_url_parser';

export interface SpacesService {
  getSpaceId: (req: any) => string;
  getActiveSpace: (req: any) => Promise<Space>;
}

export function createSpacesService(server: any): SpacesService {
  const serverBasePath = server.config().get('server.basePath');

  const contextCache = new WeakMap();

  function getSpaceId(request: any) {
    if (!contextCache.has(request)) {
      populateCache(request);
    }

    const { spaceId } = contextCache.get(request);
    return spaceId;
  }

  function getActiveSpace(request: any) {
    const cache = contextCache.get(request);

    let activeSpacePromise = cache ? cache.activeSpacePromise : undefined;

    if (!activeSpacePromise) {
      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
      activeSpacePromise = getActiveSpaceFromRequest(
        spacesClient,
        request.getBasePath(),
        serverBasePath
      );

      contextCache.set(request, {
        ...cache,
        activeSpacePromise,
      });
    }

    return activeSpacePromise;
  }

  function populateCache(request: any) {
    const spaceId = getSpaceIdFromPath(request.getBasePath(), serverBasePath);

    contextCache.set(request, {
      spaceId,
    });
  }

  return {
    getSpaceId,
    getActiveSpace,
  };
}
