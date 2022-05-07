/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IContextProvider, StartServicesAccessor } from '@kbn/core/server';
import { firstValueFrom, Observable } from 'rxjs';

import type { ILicense } from '../common/types';
import type { LicensingPluginStart, LicensingRequestHandlerContext } from './types';

/**
 * Create a route handler context for access to Kibana license information.
 * @param license$ An observable of a License instance.
 * @public
 */
export function createRouteHandlerContext(
  license$: Observable<ILicense>,
  getStartServices: StartServicesAccessor<{}, LicensingPluginStart>
): IContextProvider<LicensingRequestHandlerContext, 'licensing'> {
  return async function licensingRouteHandlerContext() {
    const [, , { featureUsage }] = await getStartServices();
    const license = await firstValueFrom(license$);

    return {
      featureUsage,
      license,
    };
  };
}
