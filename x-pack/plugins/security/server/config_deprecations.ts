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
  rename('authProviders', 'authc.providers'),

  rename('audit.appender.kind', 'audit.appender.type'),
  rename('audit.appender.layout.kind', 'audit.appender.layout.type'),
  rename('audit.appender.policy.kind', 'audit.appender.policy.type'),
  rename('audit.appender.strategy.kind', 'audit.appender.strategy.type'),
  rename('audit.appender.path', 'audit.appender.fileName'),

  unused('authorization.legacyFallback.enabled'),
  unused('authc.saml.maxRedirectURLSize'),
  // Deprecation warning for the old array-based format of `xpack.security.authc.providers`.
  (settings, fromPath, addDeprecation) => {
    if (Array.isArray(settings?.xpack?.security?.authc?.providers)) {
      addDeprecation({
        message:
          `Defining "xpack.security.authc.providers" as an array of provider types is deprecated. ` +
          `Use extended "object" format instead.`,
        correctiveActions: {
          manualSteps: [
            `Use the extended object format for "xpack.security.authc.providers" in your Kibana configuration.`,
          ],
        },
      });
    }
  },
  (settings, fromPath, addDeprecation) => {
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
      addDeprecation({
        message:
          'Enabling both `basic` and `token` authentication providers in `xpack.security.authc.providers` is deprecated. Login page will only use `token` provider.',
        correctiveActions: {
          manualSteps: [
            'Remove either the `basic` or `token` auth provider in "xpack.security.authc.providers" from your Kibana configuration.',
          ],
        },
      });
    }
  },
  (settings, fromPath, addDeprecation) => {
    const samlProviders = (settings?.xpack?.security?.authc?.providers?.saml ?? {}) as Record<
      string,
      any
    >;
    if (Object.values(samlProviders).find((provider) => !!provider.maxRedirectURLSize)) {
      addDeprecation({
        message:
          '`xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize` is deprecated and is no longer used',
        correctiveActions: {
          manualSteps: [
            `Remove "xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" from your Kibana configuration.`,
          ],
        },
      });
    }
  },
  (settings, fromPath, addDeprecation) => {
    if (settings?.xpack?.security?.enabled === false) {
      addDeprecation({
        message:
          'Disabling the security plugin (`xpack.security.enabled`) will not be supported in the next major version (8.0). ' +
          'To turn off security features, disable them in Elasticsearch instead.',
        correctiveActions: {
          manualSteps: [
            `Remove "xpack.security.enabled" from your Kibana configuration.`,
            `To turn off security features, disable them in Elasticsearch instead.`,
          ],
        },
      });
    }
  },
];
