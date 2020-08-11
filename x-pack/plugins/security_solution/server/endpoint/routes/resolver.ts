/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../types';
import {
  validateTree,
  validateEvents,
  validateChildren,
  validateAncestry,
  validateAlerts,
  validateEntities,
} from '../../../common/endpoint/schema/resolver';
import { handleEvents } from './resolver/events';
import { handleChildren } from './resolver/children';
import { handleAncestry } from './resolver/ancestry';
import { handleTree } from './resolver/tree';
import { handleAlerts } from './resolver/alerts';
import { handleEntities } from './resolver/entity';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/events',
      validate: validateEvents,
      options: { authRequired: true },
    },
    handleEvents(log, endpointAppContext)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/alerts',
      validate: validateAlerts,
      options: { authRequired: true },
    },
    handleAlerts(log, endpointAppContext)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/children',
      validate: validateChildren,
      options: { authRequired: true },
    },
    handleChildren(log, endpointAppContext)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}/ancestry',
      validate: validateAncestry,
      options: { authRequired: true },
    },
    handleAncestry(log, endpointAppContext)
  );

  router.get(
    {
      path: '/api/endpoint/resolver/{id}',
      validate: validateTree,
      options: { authRequired: true },
    },
    handleTree(log, endpointAppContext)
  );

  /**
   * Used to get details about an entity, aka process.
   */
  router.get(
    {
      path: '/api/endpoint/resolver/entity',
      validate: validateEntities,
      options: { authRequired: true },
    },
    handleEntities()
  );
}
