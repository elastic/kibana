/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { handleEventsForProcess, validateEventsForProcess } from './resolver/events_for_process';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');

  router.get(
    {
      path: '/api/endpoint/resolver/{id}',
      validate: validateEventsForProcess,
      options: { authRequired: true },
    },
    handleEventsForProcess(log)
  );
}
