/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { SecurityLicense } from '../../common/licensing';

export interface AuthorizationMode {
  useRbacForRequest(request: KibanaRequest): boolean;
}

export function authorizationModeFactory(license: SecurityLicense) {
  const useRbacForRequestCache = new WeakMap<KibanaRequest, boolean>();
  return {
    useRbacForRequest(request: KibanaRequest) {
      if (!useRbacForRequestCache.has(request)) {
        useRbacForRequestCache.set(request, license.getFeatures().allowRbac);
      }

      return useRbacForRequestCache.get(request)!;
    },
  };
}
