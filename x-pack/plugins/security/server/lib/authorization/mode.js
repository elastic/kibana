/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function authorizationModeFactory(
  xpackInfoFeature,
) {
  const useRbacForRequestCache = new WeakMap();

  return {
    useRbacForRequest(request) {
      if (!useRbacForRequestCache.has(request)) {
        useRbacForRequestCache.set(request, Boolean(xpackInfoFeature.getLicenseCheckResults().allowRbac));
      }

      return useRbacForRequestCache.get(request);
    },
  };
}
