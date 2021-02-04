/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigDeprecationProvider } from 'src/core/server';

export const securityConfigDeprecationProvider: ConfigDeprecationProvider = ({
  rename,
  unused,
}) => [
  rename('sessionTimeout', 'session.idleTimeout'),
  unused('authorization.legacyFallback.enabled'),
  unused('authc.saml.maxRedirectURLSize'),
  // Deprecation warning for the old array-based format of `xpack.security.authc.providers`.
  (settings, fromPath, log) => {
    if (Array.isArray(settings?.xpack?.security?.authc?.providers)) {
      log(
        'Defining `xpack.security.authc.providers` as an array of provider types is deprecated. Use extended `object` format instead.'
      );
    }

    return settings;
  },
  (settings, fromPath, log) => {
    const hasProviderType = (providerType: string) => {
      const providers = settings?.xpack?.security?.authc?.providers;
      if (Array.isArray(providers)) {
        return providers.includes(providerType);
      }

      return Object.values(providers?.[providerType] || {}).some(
        (provider) => (provider as { enabled: boolean | undefined })?.enabled !== false
      );
    };

    if (hasProviderType('basic') && hasProviderType('token')) {
      log(
        'Enabling both `basic` and `token` authentication providers in `xpack.security.authc.providers` is deprecated. Login page will only use `token` provider.'
      );
    }
    return settings;
  },
  (settings, fromPath, log) => {
    const samlProviders = (settings?.xpack?.security?.authc?.providers?.saml ?? {}) as Record<
      string,
      any
    >;
    if (Object.values(samlProviders).find((provider) => !!provider.maxRedirectURLSize)) {
      log(
        '`xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize` is deprecated and is no longer used'
      );
    }

    return settings;
  },
  (settings, fromPath, log) => {
    if (settings?.xpack?.security?.enabled === false) {
      log(
        'Disabling the security plugin (`xpack.security.enabled`) will not be supported in the next major version (8.0). ' +
          'To turn off security features, disable them in Elasticsearch instead.'
      );
    }
    return settings;
  },
];
