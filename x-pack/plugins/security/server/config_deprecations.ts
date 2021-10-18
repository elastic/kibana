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

    // Gross, but the cloud plugin depends on the security plugin already,
    // so we can't add a dependency in the other direction to check this in a more conventional manner.
    const isCloudInstance = typeof settings?.xpack?.cloud?.id === 'string';

    const isUsingLegacyAuditLogger = auditLoggingEnabled && legacyAuditLoggerEnabled;

    if (!isUsingLegacyAuditLogger) {
      return;
    }

    const title = i18n.translate('xpack.security.deprecations.auditLoggerTitle', {
      defaultMessage: 'The legacy audit logger is deprecated',
    });

    const message = i18n.translate('xpack.security.deprecations.auditLoggerMessage', {
      defaultMessage: 'Use the new ECS-compliant audit logger.',
    });

    const documentationUrl = `https://www.elastic.co/guide/en/kibana/${branch}/security-settings-kb.html#audit-logging-settings`;

    const configPath = 'xpack.security.audit.appender';
    if (isCloudInstance) {
      addDeprecation({
        title,
        message,
        configPath,
        level: 'warning',
        documentationUrl,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.auditLogger.manualStepOneMessageCloud', {
              defaultMessage:
                'To enable the ECS audit logger now, add the "xpack.security.audit.appender.type: rolling-file" setting.',
            }),
            i18n.translate('xpack.security.deprecations.auditLogger.manualStepTwoMessageCloud', {
              defaultMessage: `If you don't make any changes, the ECS audit logger will be enabled when you upgrade to 8.0.`,
            }),
          ],
        },
      });
    } else {
      addDeprecation({
        title,
        message,
        configPath,
        level: 'warning',
        documentationUrl,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.auditLogger.manualStepOneMessage', {
              defaultMessage:
                'To enable the ECS audit logger now, configure an appender with "xpack.security.audit.appender".',
            }),
            i18n.translate('xpack.security.deprecations.auditLogger.manualStepTwoMessage', {
              defaultMessage: `If you don't make any changes, the ECS audit logger will be enabled when you upgrade to 8.0.`,
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
        configPath: 'xpack.security.authc.providers',
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
        configPath: 'xpack.security.authc.providers',
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

    const foundProvider = Object.entries(samlProviders).find(
      ([_, provider]) => !!provider.maxRedirectURLSize
    );
    if (foundProvider) {
      addDeprecation({
        configPath: `xpack.security.authc.providers.saml.${foundProvider[0]}.maxRedirectURLSize`,
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
  (settings, fromPath, addDeprecation, { branch }) => {
    if ('enabled' in (settings?.xpack?.security || {})) {
      addDeprecation({
        configPath: 'xpack.security.enabled',
        title: i18n.translate('xpack.security.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.security.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.security.deprecations.enabledMessage', {
          defaultMessage:
            'Enabling or disabling the Security plugin in Kibana is deprecated. Configure security in Elasticsearch instead.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/elasticsearch/reference/${branch}/secure-cluster.html`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Remove "xpack.security.enabled" from kibana.yml.',
            }),
            i18n.translate('xpack.security.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage:
                'Set "xpack.security.enabled" to true or false in elasticsearch.yml to enable or disable security.',
            }),
          ],
        },
      });
    }
  },
  // Default values for session expiration timeouts.
  (settings, fromPath, addDeprecation) => {
    if (settings?.xpack?.security?.session?.idleTimeout === undefined) {
      addDeprecation({
        configPath: 'xpack.security.session.idleTimeout',
        level: 'warning',
        title: i18n.translate('xpack.security.deprecations.idleTimeoutTitle', {
          defaultMessage: '"xpack.security.session.idleTimeout" is now 1 hour',
        }),
        message: i18n.translate('xpack.security.deprecations.idleTimeoutMessage', {
          defaultMessage:
            'User sessions will automatically time out after 1 hour of inactivity starting in 8.0. Override this value to change the timeout.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.idleTimeout.manualStepOneMessage', {
              defaultMessage:
                'To configure a custom timeout, set "xpack.security.session.idleTimeout". Use the format <count>⁠[ms|s|m|h|d|w|M|Y], for example, 20m, 24h, 7d, 1w. A value of 0 disables the timeout.',
              description:
                'Please preserve a Word Joiner (U+2060) symbol after <count> in translation.',
            }),
          ],
        },
      });
    }

    if (settings?.xpack?.security?.session?.lifespan === undefined) {
      addDeprecation({
        configPath: 'xpack.security.session.lifespan',
        level: 'warning',
        title: i18n.translate('xpack.security.deprecations.lifespanTitle', {
          defaultMessage: '"xpack.security.session.lifespan" is now 30 days',
        }),
        message: i18n.translate('xpack.security.deprecations.lifespanMessage', {
          defaultMessage:
            'Users are automatically required to log in again after 30 days starting in 8.0. Override this value to change the timeout.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.security.deprecations.lifespan.manualStepOneMessage', {
              defaultMessage:
                'To configure a custom timeout, set "xpack.security.session.lifespan". Use the format <count>⁠[ms|s|m|h|d|w|M|Y], for example, 20m, 24h, 7d, 1w. A value of 0 disables the timeout.',
              description:
                'Please preserve a Word Joiner (U+2060) symbol after <count> in translation.',
            }),
          ],
        },
      });
    }
  },
];
