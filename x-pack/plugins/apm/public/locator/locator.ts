/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import { getLocatorEnabledRoutes } from './get_locator_enabled_routes';
import type { APMLocatorPayload } from './types';

export const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

async function loadApmRoutesModule() {
  const { apmRouter, apmRoutes } = await import(
    '../components/routing/apm_route_config'
  );
  const locatorEnabledRoutes = getLocatorEnabledRoutes(apmRoutes);

  return {
    apmRouter,
    locatorEnabledRoutes,
  };
}

export class APMLocatorDefinition
  implements LocatorDefinition<APMLocatorPayload>
{
  readonly id = APM_APP_LOCATOR_ID;
  apmRoutesModule = loadApmRoutesModule();

  async getLocation(payload: APMLocatorPayload) {
    const { apmRouter, locatorEnabledRoutes } = await this.apmRoutesModule;
    const route = locatorEnabledRoutes[payload.pageId];

    if (!route) {
      throw new Error(`Cannot find a matching route for: ${payload.pageId}`);
    }

    const defaultQueryParams = merge(route.defaults!.query, payload.query);

    // @ts-ignore
    const path = apmRouter.link(route.path, {
      path: 'params' in payload ? payload.params : {},
      query: defaultQueryParams,
    });

    return {
      app: 'apm',
      path,
      state: {},
    };
  }
}
