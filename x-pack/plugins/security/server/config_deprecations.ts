/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
  // Deprecation warning for the legacy audit logger.
  (settings, fromPath, addDeprecation) => {
    const auditLoggingEnabled = settings?.xpack?.security?.audit?.enabled ?? false;
    const legacyAuditLoggerEnabled = !settings?.xpack?.security?.audit?.appender;
    if (auditLoggingEnabled && legacyAuditLoggerEnabled) {
      addDeprecation({
        title: i18n.translate('xpack.security.deprecations.auditLoggerTitle', {
          defaultMessage: 'The legacy audit logger is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.auditLoggerMessage', {
          defaultMessage:
            'The legacy audit logger is deprecated in favor of the new ECS-compliant audit logger.',
        }),
        documentationUrl:
          'https://www.elastic.co/guide/en/kibana/current/security-settings-kb.html#audit-logging-settings',
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.auditLogger.manualStepOneMessage', {
              defaultMessage:
                'Declare an audit logger "appender" via "xpack.security.audit.appender" to enable the ECS audit logger.',
            }),
          ],
        },
      });
    }
  },

  // Deprecation warning for the old array-based format of `xpack.security.authc.providers`.
  (settings, fromPath, addDeprecation) => {
    if (Array.isArray(settings?.xpack?.security?.authc?.providers)) {
      addDeprecation({
        title: i18n.translate('xpack.security.deprecations.authcProvidersTitle', {
          defaultMessage:
            'Defining "xpack.security.authc.providers" as an array of provider types is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.authcProvidersMessage', {
          defaultMessage:
            '"xpack.security.authc.providers" accepts an extended "object" format instead of an array of provider types.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.authcProviders.manualStepOneMessage', {
              defaultMessage:
                'Use the extended object format for "xpack.security.authc.providers" in your Kibana configuration.',
            }),
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
        title: i18n.translate('xpack.security.deprecations.basicAndTokenProvidersTitle', {
          defaultMessage:
            'Both "basic" and "token" authentication providers are enabled in "xpack.security.authc.providers"',
        }),
        message: i18n.translate('xpack.security.deprecations.basicAndTokenProvidersMessage', {
          defaultMessage:
            'Enabling both "basic" and "token" authentication providers in "xpack.security.authc.providers" is deprecated. Login page will only use "token" provider.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.security.deprecations.basicAndTokenProviders.manualStepOneMessage',
              {
                defaultMessage:
                  'Remove either the "basic" or "token" auth provider in "xpack.security.authc.providers" from your Kibana configuration.',
              }
            ),
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
        title: i18n.translate('xpack.security.deprecations.maxRedirectURLSizeTitle', {
          defaultMessage:
            '"xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.maxRedirectURLSizeMessage', {
          defaultMessage:
            '"xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" is no longer used.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.maxRedirectURLSize.manualStepOneMessage', {
              defaultMessage:
                'Remove "xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" from your Kibana configuration.',
            }),
          ],
        },
      });
    }
  },
  (settings, fromPath, addDeprecation) => {
    if (settings?.xpack?.security?.enabled === false) {
      addDeprecation({
        title: i18n.translate('xpack.security.deprecations.enabledTitle', {
          defaultMessage: 'Disabling the security plugin "xpack.security.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.enabledMessage', {
          defaultMessage:
            'Disabling the security plugin "xpack.security.enabled" will only be supported by disable security in Elasticsearch.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: `Remove "xpack.security.enabled" from your Kibana configuration.`,
            }),
            i18n.translate('xpack.security.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage: `To turn off security features, disable them in Elasticsearch instead.`,
            }),
          ],
        },
      });
    }
  },
];
