/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { handleRelatedEvents, validateRelatedEvents } from './resolver/related_events';
import { handleChildren, validateChildren } from './resolver/children';
import { handleLifecycle, validateLifecycle } from './resolver/lifecycle';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/related',
      validate: validateRelatedEvents,
      options: { authRequired: true },
    },
    handleRelatedEvents(log)
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
      path: '/api/endpoint/resolver/{id}',
      validate: validateLifecycle,
      options: { authRequired: true },
    },
    handleLifecycle(log)
  );
}
