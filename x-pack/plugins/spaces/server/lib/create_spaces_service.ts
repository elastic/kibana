/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { getSpaceIdFromPath } from './spaces_url_parser';

export interface SpacesService {
  isInDefaultSpace: (req: any) => boolean;
  getSpaceId: (req: any) => string;
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

  function isInDefaultSpace(request: any) {
    if (!contextCache.has(request)) {
      populateCache(request);
    }

    return contextCache.get(request).isInDefaultSpace;
  }

  function populateCache(request: any) {
    const spaceId = getSpaceIdFromPath(request.getBasePath(), serverBasePath);

    contextCache.set(request, {
      spaceId,
      isInDefaultSpace: spaceId === DEFAULT_SPACE_ID,
    });
  }

  return {
    getSpaceId,
    isInDefaultSpace,
  };
}
