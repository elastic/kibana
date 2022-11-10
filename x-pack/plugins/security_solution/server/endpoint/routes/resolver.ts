/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { StartPlugins } from '../../plugin';
import type { ConfigType } from '../../config';
import {
  validateEvents,
  validateEntities,
  validateTree,
} from '../../../common/endpoint/schema/resolver';
import { handleTree } from './resolver/tree/handler';
import { handleEntities } from './resolver/entity/handler';
import { handleEvents } from './resolver/events';

export const registerResolverRoutes = async (
  router: SecuritySolutionPluginRouter,
  startServices: StartServicesAccessor<StartPlugins>,
  config: ConfigType
) => {
  const [, { ruleRegistry, licensing }] = await startServices();
  router.post(
    {
      path: '/api/endpoint/resolver/tree',
      validate: validateTree,
      options: { authRequired: true },
    },
    handleTree(ruleRegistry, config, licensing)
  );

  router.post(
    {
      path: '/api/endpoint/resolver/events',
      validate: validateEvents,
      options: { authRequired: true },
    },
    handleEvents(ruleRegistry)
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
};
