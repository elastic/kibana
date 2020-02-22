/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { handleEvents, validateEvents } from './resolver/events';
import { handleChildren, validateChildren } from './resolver/children';
import { handleAncestry, validateAncestry } from './resolver/ancestry';
import { handleTree, validateTree } from './resolver/tree';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/events',
      validate: validateEvents,
      options: { authRequired: true },
    },
    handleEvents(log)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/children',
      validate: validateChildren,
      options: { authRequired: true },
    },
    handleChildren(log)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/ancestry',
      validate: validateAncestry,
      options: { authRequired: true },
    },
    handleAncestry(log)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}',
      validate: validateTree,
      options: { authRequired: true },
    },
    handleTree(log)
  );
}
