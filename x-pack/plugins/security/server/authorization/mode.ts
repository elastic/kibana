/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request } from 'hapi';
import { XPackFeature } from '../../../../xpack_main/xpack_main';

export interface AuthorizationMode {
  useRbacForRequest(request: Request): boolean;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function authorizationModeFactory(securityXPackFeature: XPackFeature) {
  const useRbacForRequestCache = new WeakMap();

  return {
    useRbacForRequest(request: Request) {
      if (!useRbacForRequestCache.has(request)) {
        useRbacForRequestCache.set(
          request,
          Boolean(securityXPackFeature.getLicenseCheckResults().allowRbac)
        );
      }

      return useRbacForRequestCache.get(request);
    },
  };
}
