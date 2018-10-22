/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function authorizationModeFactory(
  application,
  config,
  log,
  shieldClient,
  xpackInfoFeature,
) {
  const useRbacForRequestCache = new WeakMap();

  const shouldUseRbacForRequest = async (request) => {
    if (!config.get('xpack.security.authorization.legacyFallback.enabled')) {
      return true;
    }

    const { callWithRequest } = shieldClient;

    const getUserPrivilegesResponse = await callWithRequest(request, 'shield.getUserPrivileges');

    // Superusers have `*` and all other roles will have the explicit application.
    // We aren't using wildcards at this time, so if the user somehow specifies them
    // using the ES apis directly (which is documented as unsupported) they won't work here.
    const result = getUserPrivilegesResponse.applications
      .some(entry => entry.application === '*' || entry.application === application);

    return result;
  };

  const isRbacEnabled = () => xpackInfoFeature.getLicenseCheckResults().allowRbac;

  return {
    async initialize(request) {
      if (useRbacForRequestCache.has(request)) {
        log(['security', 'debug'], `Authorization mode is already initialized`);
        return;
      }

      if (!isRbacEnabled()) {
        useRbacForRequestCache.set(request, false);
        return;
      }

      const result = await shouldUseRbacForRequest(request);
      useRbacForRequestCache.set(request, result);
    },

    useRbacForRequest(request) {
      // the following can happen when the user isn't authenticated. Either true or false would work here,
      // but we're going to go with false as this is closer to the "legacy" behavior
      if (!useRbacForRequestCache.has(request)) {
        return false;
      }

      return useRbacForRequestCache.get(request);
    },
  };
}
