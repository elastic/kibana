/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { LocatorDefinition } from 'src/plugins/share/common';
import {
  apmRouter,
  ApmRoutes,
  apmRoutes,
} from '../components/routing/apm_route_config';
import { getLocatorEnabledRoutes } from './get_locator_enabled_routes';
import type { APMLocatorPayload } from './types';
import { LinkFunc } from './types';

export const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

export class APMLocatorDefinition
  implements LocatorDefinition<APMLocatorPayload>
{
  public readonly id = APM_APP_LOCATOR_ID;

  private getLink: LinkFunc = this.#getLocatorLinkFunc(apmRoutes);

  public readonly getLocation = async (payload: APMLocatorPayload) => {
    const path = this.getLink(payload);

    return {
      app: 'apm',
      path,
      state: {},
    };
  };

  #getLocatorLinkFunc(routes: ApmRoutes): LinkFunc {
    const locatorEnabledRoutes = getLocatorEnabledRoutes(routes);

    const linkFunc: LinkFunc = (payload) => {
      const route = locatorEnabledRoutes[payload.pageId];

      if (!route) {
        throw new Error(`Cannot find a matching route for: ${payload.pageId}`);
      }

      const defaultQueryParams = merge(route.defaults!.query, payload.query);
      // @ts-ignore
      const link = apmRouter.link(route.path, {
        // @ts-ignore
        path: payload.params,
        // @ts-ignore
        query: defaultQueryParams,
      });
      return link;
    };

    return linkFunc;
  }
}
