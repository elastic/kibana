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
  renameFromRoot,
  unused,
}) => [
  rename('sessionTimeout', 'session.idleTimeout'),
  rename('authProviders', 'authc.providers'),

  rename('audit.appender.kind', 'audit.appender.type'),
  rename('audit.appender.layout.kind', 'audit.appender.layout.type'),
  rename('audit.appender.policy.kind', 'audit.appender.policy.type'),
  rename('audit.appender.strategy.kind', 'audit.appender.strategy.type'),
  rename('audit.appender.path', 'audit.appender.fileName'),

  renameFromRoot(
    'security.showInsecureClusterWarning',
    'xpack.security.showInsecureClusterWarning'
  ),

  unused('authorization.legacyFallback.enabled'),
  unused('authc.saml.maxRedirectURLSize'),
  // Deprecation warning for the legacy audit logger.
  (settings, fromPath, addDeprecation, { branch }) => {
    const auditLoggingEnabled = settings?.xpack?.security?.audit?.enabled ?? false;
    const legacyAuditLoggerEnabled = !settings?.xpack?.security?.audit?.appender;
    if (auditLoggingEnabled && legacyAuditLoggerEnabled) {
      addDeprecation({
        configPath: 'xpack.security.audit.appender',
        title: i18n.translate('xpack.security.deprecations.auditLoggerTitle', {
          defaultMessage: 'The legacy audit logger is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.auditLoggerMessage', {
          defaultMessage:
            'The legacy audit logger is deprecated in favor of the new ECS-compliant audit logger.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/security-settings-kb.html#audit-logging-settings`,
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
  (settings, _fromPath, addDeprecation, { branch }) => {
    if (Array.isArray(settings?.xpack?.security?.authc?.providers)) {
      addDeprecation({
        configPath: 'xpack.security.authc.providers',
        title: i18n.translate('xpack.security.deprecations.authcProvidersTitle', {
          defaultMessage: 'The array format for "xpack.security.authc.providers" is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.authcProvidersMessage', {
          defaultMessage: 'Use the new object format instead of an array of provider types.',
        }),
        level: 'warning',
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/security-settings-kb.html#authentication-security-settings`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.authcProviders.manualSteps1', {
              defaultMessage:
                'Remove the "xpack.security.authc.providers" setting from kibana.yml.',
            }),
            i18n.translate('xpack.security.deprecations.authcProviders.manualSteps2', {
              defaultMessage: 'Add your authentication providers using the new object format.',
            }),
          ],
        },
      });
    }
  },
  (settings, _fromPath, addDeprecation, { branch }) => {
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
      const basicProvider = 'basic';
      const tokenProvider = 'token';
      addDeprecation({
        configPath: 'xpack.security.authc.providers',
        title: i18n.translate('xpack.security.deprecations.basicAndTokenProvidersTitle', {
          defaultMessage:
            'Using both "{basicProvider}" and "{tokenProvider}" providers in "xpack.security.authc.providers" has no effect',
          values: { basicProvider, tokenProvider },
        }),
        message: i18n.translate('xpack.security.deprecations.basicAndTokenProvidersMessage', {
          defaultMessage:
            'Use only one of these providers. When both providers are set, Kibana only uses the "{tokenProvider}" provider.',
          values: { tokenProvider },
        }),
        level: 'warning',
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/security-settings-kb.html#authentication-security-settings`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.basicAndTokenProviders.manualSteps1', {
              defaultMessage:
                'Remove the "{basicProvider}" provider from "xpack.security.authc.providers" in kibana.yml.',
              values: { basicProvider },
            }),
          ],
        },
      });
    }
  },
  (settings, _fromPath, addDeprecation, { branch }) => {
    const samlProviders = (settings?.xpack?.security?.authc?.providers?.saml ?? {}) as Record<
      string,
      any
    >;

    const foundProvider = Object.entries(samlProviders).find(
      ([_, provider]) => !!provider.maxRedirectURLSize
    );
    if (foundProvider) {
      addDeprecation({
        configPath: `xpack.security.authc.providers.saml.${foundProvider[0]}.maxRedirectURLSize`,
        title: i18n.translate('xpack.security.deprecations.maxRedirectURLSizeTitle', {
          defaultMessage:
            '"xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" has no effect',
        }),
        message: i18n.translate('xpack.security.deprecations.maxRedirectURLSizeMessage', {
          defaultMessage: 'This setting is no longer used.',
        }),
        level: 'warning',
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/security-settings-kb.html#authentication-security-settings`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.maxRedirectURLSize.manualSteps1', {
              defaultMessage:
                'Remove "xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize" from kibana.yml.',
            }),
          ],
        },
      });
    }
  },
  (settings, fromPath, addDeprecation) => {
    if (settings?.xpack?.security?.enabled === false) {
      addDeprecation({
        configPath: 'xpack.security.enabled',
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
