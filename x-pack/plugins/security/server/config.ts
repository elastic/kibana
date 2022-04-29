/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import type { Duration } from 'moment';
import path from 'path';

import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { AppenderConfigType, Logger } from '@kbn/core/server';
import { config as coreConfig } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { getLogsPath } from '@kbn/utils';

import type { AuthenticationProvider } from '../common/model';

export type ConfigType = ReturnType<typeof createConfig>;
type RawConfigType = TypeOf<typeof ConfigSchema>;

interface ProvidersCommonConfigType {
  enabled: Type<boolean>;
  showInSelector: Type<boolean>;
  order: Type<number>;
  description?: Type<string>;
  hint?: Type<string>;
  icon?: Type<string>;
  session?: Type<{ idleTimeout?: Duration | null; lifespan?: Duration | null }>;
}

const providerOptionsSchema = (providerType: string, optionsSchema: Type<any>) =>
  schema.conditional(
    schema.siblingRef('providers'),
    schema.arrayOf(schema.string(), {
      validate: (providers) => (!providers.includes(providerType) ? 'error' : undefined),
    }),
    optionsSchema,
    schema.never()
  );

function getCommonProviderSchemaProperties(overrides: Partial<ProvidersCommonConfigType> = {}) {
  return {
    enabled: schema.boolean({ defaultValue: true }),
    showInSelector: schema.boolean({ defaultValue: true }),
    order: schema.number({ min: 0 }),
    description: schema.maybe(schema.string()),
    hint: schema.maybe(schema.string()),
    icon: schema.maybe(schema.string()),
    accessAgreement: schema.maybe(schema.object({ message: schema.string() })),
    session: schema.object({
      idleTimeout: schema.maybe(schema.oneOf([schema.duration(), schema.literal(null)])),
      lifespan: schema.maybe(schema.oneOf([schema.duration(), schema.literal(null)])),
    }),
    ...overrides,
  };
}

function getUniqueProviderSchema<TProperties extends Record<string, Type<any>>>(
  providerType: string,
  overrides?: Partial<ProvidersCommonConfigType>,
  properties?: TProperties
) {
  return schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object(
        properties
          ? { ...getCommonProviderSchemaProperties(overrides), ...properties }
          : getCommonProviderSchemaProperties(overrides)
      ),
      {
        validate(config) {
          if (Object.values(config).filter((provider) => provider.enabled).length > 1) {
            return `Only one "${providerType}" provider can be configured.`;
          }
        },
      }
    )
  );
}

type ProvidersConfigType = TypeOf<typeof providersConfigSchema>;
const providersConfigSchema = schema.object(
  {
    basic: getUniqueProviderSchema('basic', {
      description: schema.string({
        defaultValue: i18n.translate('xpack.security.loginWithElasticsearchLabel', {
          defaultMessage: 'Log in with Elasticsearch',
        }),
      }),
      icon: schema.string({ defaultValue: 'logoElasticsearch' }),
      showInSelector: schema.boolean({
        defaultValue: true,
        validate: (value) => {
          if (!value) {
            return '`basic` provider only supports `true` in `showInSelector`.';
          }
        },
      }),
    }),
    token: getUniqueProviderSchema('token', {
      description: schema.string({
        defaultValue: i18n.translate('xpack.security.loginWithElasticsearchLabel', {
          defaultMessage: 'Log in with Elasticsearch',
        }),
      }),
      icon: schema.string({ defaultValue: 'logoElasticsearch' }),
      showInSelector: schema.boolean({
        defaultValue: true,
        validate: (value) => {
          if (!value) {
            return '`token` provider only supports `true` in `showInSelector`.';
          }
        },
      }),
    }),
    kerberos: getUniqueProviderSchema('kerberos'),
    pki: getUniqueProviderSchema('pki'),
    saml: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({
          ...getCommonProviderSchemaProperties(),
          realm: schema.string(),
          maxRedirectURLSize: schema.maybe(schema.byteSize()),
          useRelayStateDeepLink: schema.boolean({ defaultValue: false }),
        })
      )
    ),
    oidc: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({ ...getCommonProviderSchemaProperties(), realm: schema.string() })
      )
    ),
    anonymous: getUniqueProviderSchema(
      'anonymous',
      {
        description: schema.string({
          defaultValue: i18n.translate('xpack.security.loginAsGuestLabel', {
            defaultMessage: 'Continue as Guest',
          }),
        }),
        hint: schema.string({
          defaultValue: i18n.translate('xpack.security.loginAsGuestHintLabel', {
            defaultMessage: 'For anonymous users',
          }),
        }),
        icon: schema.string({ defaultValue: 'globe' }),
        session: schema.object({
          idleTimeout: schema.nullable(schema.duration()),
          lifespan: schema.maybe(schema.oneOf([schema.duration(), schema.literal(null)])),
        }),
      },
      {
        credentials: schema.oneOf([
          schema.literal('elasticsearch_anonymous_user'),
          schema.object({
            username: schema.string(),
            password: schema.string(),
          }),
          schema.object({
            apiKey: schema.oneOf([
              schema.object({ id: schema.string(), key: schema.string() }),
              schema.string(),
            ]),
          }),
        ]),
      }
    ),
  },
  {
    validate(config) {
      const checks = { sameOrder: new Map<number, string>(), sameName: new Map<string, string>() };
      for (const [providerType, providerGroup] of Object.entries(config)) {
        for (const [providerName, { enabled, order }] of Object.entries(providerGroup ?? {})) {
          if (!enabled) {
            continue;
          }

          const providerPath = `xpack.security.authc.providers.${providerType}.${providerName}`;
          const providerWithSameOrderPath = checks.sameOrder.get(order);
          if (providerWithSameOrderPath) {
            return `Found multiple providers configured with the same order "${order}": [${providerWithSameOrderPath}, ${providerPath}]`;
          }
          checks.sameOrder.set(order, providerPath);

          const providerWithSameName = checks.sameName.get(providerName);
          if (providerWithSameName) {
            return `Found multiple providers configured with the same name "${providerName}": [${providerWithSameName}, ${providerPath}]`;
          }
          checks.sameName.set(providerName, providerPath);
        }
      }
    },
  }
);

export const ConfigSchema = schema.object({
  loginAssistanceMessage: schema.string({ defaultValue: '' }),
  showInsecureClusterWarning: schema.boolean({ defaultValue: true }),
  loginHelp: schema.maybe(schema.string()),
  cookieName: schema.string({ defaultValue: 'sid' }),
  encryptionKey: schema.conditional(
    schema.contextRef('dist'),
    true,
    schema.maybe(schema.string({ minLength: 32 })),
    schema.string({ minLength: 32, defaultValue: 'a'.repeat(32) })
  ),
  session: schema.object({
    idleTimeout: schema.oneOf([schema.duration(), schema.literal(null)], {
      defaultValue: schema.duration().validate('8h'),
    }),
    lifespan: schema.oneOf([schema.duration(), schema.literal(null)], {
      defaultValue: schema.duration().validate('30d'),
    }),
    cleanupInterval: schema.duration({
      defaultValue: '1h',
      validate(value) {
        if (value.asSeconds() < 10) {
          return 'the value must be greater or equal to 10 seconds.';
        }
      },
    }),
  }),
  secureCookies: schema.boolean({ defaultValue: false }),
  sameSiteCookies: schema.maybe(
    schema.oneOf([schema.literal('Strict'), schema.literal('Lax'), schema.literal('None')])
  ),
  public: schema.object({
    protocol: schema.maybe(schema.oneOf([schema.literal('http'), schema.literal('https')])),
    hostname: schema.maybe(schema.string({ hostname: true })),
    port: schema.maybe(schema.number({ min: 0, max: 65535 })),
  }),
  authc: schema.object({
    selector: schema.object({ enabled: schema.maybe(schema.boolean()) }),
    providers: schema.oneOf([schema.arrayOf(schema.string()), providersConfigSchema], {
      defaultValue: {
        basic: {
          basic: {
            enabled: true,
            showInSelector: true,
            order: 0,
            description: undefined,
            hint: undefined,
            icon: undefined,
            accessAgreement: undefined,
            session: { idleTimeout: undefined, lifespan: undefined },
          },
        },
        token: undefined,
        saml: undefined,
        oidc: undefined,
        pki: undefined,
        kerberos: undefined,
        anonymous: undefined,
      },
    }),
    oidc: providerOptionsSchema('oidc', schema.object({ realm: schema.string() })),
    saml: providerOptionsSchema(
      'saml',
      schema.object({
        realm: schema.maybe(schema.string()),
        maxRedirectURLSize: schema.maybe(schema.byteSize()),
      })
    ),
    http: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      autoSchemesEnabled: schema.boolean({ defaultValue: true }),
      schemes: schema.arrayOf(schema.string(), { defaultValue: ['apikey', 'bearer'] }),
    }),
  }),
  audit: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    appender: schema.maybe(coreConfig.logging.appenders),
    ignore_filters: schema.maybe(
      schema.arrayOf(
        schema.object({
          actions: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
          categories: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
          types: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
          outcomes: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
          spaces: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
        })
      )
    ),
  }),
});

export function createConfig(
  config: RawConfigType,
  logger: Logger,
  { isTLSEnabled }: { isTLSEnabled: boolean }
) {
  let encryptionKey = config.encryptionKey;
  if (encryptionKey === undefined) {
    logger.warn(
      'Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on ' +
        'restart, please set xpack.security.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );

    encryptionKey = crypto.randomBytes(16).toString('hex');
  }

  let secureCookies = config.secureCookies;
  if (!isTLSEnabled) {
    if (secureCookies) {
      logger.warn(
        'Using secure cookies, but SSL is not enabled inside Kibana. SSL must be configured outside of Kibana to ' +
          'function properly.'
      );
    } else {
      logger.warn(
        'Session cookies will be transmitted over insecure connections. This is not recommended.'
      );
    }
  } else if (!secureCookies) {
    secureCookies = true;
  }

  const isUsingLegacyProvidersFormat = Array.isArray(config.authc.providers);
  const providers = (
    isUsingLegacyProvidersFormat
      ? [...new Set(config.authc.providers as Array<keyof ProvidersConfigType>)].reduce(
          (legacyProviders, providerType, order) => {
            legacyProviders[providerType] = {
              [providerType]:
                providerType === 'saml' || providerType === 'oidc'
                  ? { enabled: true, showInSelector: true, order, ...config.authc[providerType] }
                  : { enabled: true, showInSelector: true, order },
            };
            return legacyProviders;
          },
          {} as Record<string, unknown>
        )
      : config.authc.providers
  ) as ProvidersConfigType;

  // Remove disabled providers and sort the rest.
  const sortedProviders: Array<{
    type: keyof ProvidersConfigType;
    name: string;
    order: number;
    hasAccessAgreement: boolean;
  }> = [];
  for (const [type, providerGroup] of Object.entries(providers)) {
    for (const [name, { enabled, order, accessAgreement }] of Object.entries(providerGroup ?? {})) {
      if (!enabled) {
        delete providerGroup![name];
      } else {
        sortedProviders.push({
          type: type as any,
          name,
          order,
          hasAccessAgreement: !!accessAgreement?.message,
        });
      }
    }
  }

  sortedProviders.sort(({ order: orderA }, { order: orderB }) =>
    orderA < orderB ? -1 : orderA > orderB ? 1 : 0
  );

  // We enable Login Selector by default if a) it's not explicitly disabled, b) new config
  // format of providers is used and c) we have more than one provider enabled.
  const isLoginSelectorEnabled =
    typeof config.authc.selector.enabled === 'boolean'
      ? config.authc.selector.enabled
      : !isUsingLegacyProvidersFormat &&
        sortedProviders.filter(({ type, name }) => providers[type]?.[name].showInSelector).length >
          1;

  const appender: AppenderConfigType | undefined =
    config.audit.appender ??
    ({
      type: 'rolling-file',
      fileName: path.join(getLogsPath(), 'audit.log'),
      layout: {
        type: 'json',
      },
      policy: {
        type: 'time-interval',
        interval: schema.duration().validate('24h'),
      },
      strategy: {
        type: 'numeric',
        max: 10,
      },
    } as AppenderConfigType);
  return {
    ...config,
    audit: {
      ...config.audit,
      ...(config.audit.enabled && { appender }),
    },
    authc: {
      selector: { ...config.authc.selector, enabled: isLoginSelectorEnabled },
      providers,
      sortedProviders: Object.freeze(sortedProviders),
      http: config.authc.http,
    },
    session: getSessionConfig(config.session, providers),
    encryptionKey,
    secureCookies,
  };
}

function getSessionConfig(session: RawConfigType['session'], providers: ProvidersConfigType) {
  return {
    cleanupInterval: session.cleanupInterval,
    getExpirationTimeouts(provider: AuthenticationProvider | undefined) {
      // Both idle timeout and lifespan from the provider specific session config can have three
      // possible types of values: `Duration`, `null` and `undefined`. The `undefined` type means that
      // provider doesn't override session config and we should fall back to the global one instead.
      // Note: using an `undefined` provider argument returns the global timeouts.
      let providerSessionConfig:
        | { idleTimeout?: Duration | null; lifespan?: Duration | null }
        | undefined;
      if (provider) {
        const { type, name } = provider;
        providerSessionConfig = providers[type as keyof ProvidersConfigType]?.[name]?.session;
      }
      const [idleTimeout, lifespan] = [
        [session.idleTimeout, providerSessionConfig?.idleTimeout],
        [session.lifespan, providerSessionConfig?.lifespan],
      ].map(([globalTimeout, providerTimeout]) => {
        const timeout = providerTimeout === undefined ? globalTimeout ?? null : providerTimeout;
        return timeout && timeout.asMilliseconds() > 0 ? timeout : null;
      });

      return {
        idleTimeout,
        lifespan,
      };
    },
  };
}
