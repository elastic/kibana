/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StartServicesAccessor } from '@kbn/core/server';
import {
  validateEntities,
  validateEvents,
  validateTree,
} from '../../../common/endpoint/schema/resolver';
import type { ConfigType } from '../../config';
import type { StartPlugins } from '../../plugin';
import type { SecuritySolutionPluginRouter } from '../../types';
import { handleEntities } from './resolver/entity/handler';
import { handleEvents } from './resolver/events';
import { handleTree } from './resolver/tree/handler';

export const registerResolverRoutes = (
  router: SecuritySolutionPluginRouter,
  startServices: StartServicesAccessor<StartPlugins>,
  config: ConfigType
) => {
  const getRuleRegistry = async () => {
    const [, { ruleRegistry }] = await startServices();
    return ruleRegistry;
  };

  const getLicensing = async () => {
    const [, { licensing }] = await startServices();
    return licensing;
  };

  router.post(
    {
      path: '/api/endpoint/resolver/tree',
      validate: validateTree,
      options: { authRequired: true },
    },
    handleTree(getRuleRegistry, config, getLicensing)
  );

  router.post(
    {
      path: '/api/endpoint/resolver/events',
      validate: validateEvents,
      options: { authRequired: true },
    },
    handleEvents(getRuleRegistry)
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
    handleEntities(config.experimentalFeatures)
  );
};
