/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceUrlContext } from '../../common/spaces_url_parser';
import { cloneDeep } from 'lodash';

export function createSpacesService() {

  const contextCache = new WeakMap();
  const spaceChangeHandlers = new Map();

  function getUrlContext(request, defaultContext = null) {
    if (!contextCache.has(request)) {
      _populateCache(request, defaultContext);
    }

    const { urlContext } = contextCache.get(request);
    return urlContext;
  }

  function registerSpaceChangeHandler(id, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    if (spaceChangeHandlers.has(id)) {
      throw new Error(`change handler with id ${id} is already registered`);
    }

    spaceChangeHandlers.set(id, handler);
  }

  function _onSpaceChange(operation, space, request) {
    spaceChangeHandlers.forEach(handler => handler(operation, cloneDeep(space), request));
  }

  function _populateCache(request, defaultContext) {
    const urlContext = getSpaceUrlContext(request.getBasePath(), defaultContext);

    contextCache.set(request, {
      urlContext
    });
  }

  return {
    getUrlContext,
    registerSpaceChangeHandler,

    // not designed to be used outside of the Spaces plugin
    _onSpaceChange,
  };
}
