/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { EndpointAppContext } from '../types';
import { handleEventsForProcess } from './resolver/events_for_process';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');

  router.get(
    {
      path: '/api/endpoint/resolver/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
        query: schema.object({
          after: schema.maybe(schema.string()),
          limit: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
        }),
      },
      options: { authRequired: true },
    },
    handleEventsForProcess(log)
  );
}
