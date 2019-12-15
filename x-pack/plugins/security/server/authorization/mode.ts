/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { SecurityLicense } from '../licensing';

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
