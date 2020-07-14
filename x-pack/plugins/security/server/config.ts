/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { schema, Type, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { Logger } from '../../../../src/core/server';

export type ConfigType = ReturnType<typeof createConfig>;

const providerOptionsSchema = (providerType: string, optionsSchema: Type<any>) =>
  schema.conditional(
    schema.siblingRef('providers'),
    schema.arrayOf(schema.string(), {
      validate: (providers) => (!providers.includes(providerType) ? 'error' : undefined),
    }),
    optionsSchema,
    schema.never()
  );

type ProvidersCommonConfigType = Record<
  'enabled' | 'showInSelector' | 'order' | 'description' | 'hint' | 'icon',
  Type<any>
>;
function getCommonProviderSchemaProperties(overrides: Partial<ProvidersCommonConfigType> = {}) {
  return {
    enabled: schema.boolean({ defaultValue: true }),
    showInSelector: schema.boolean({ defaultValue: true }),
    order: schema.number({ min: 0 }),
    description: schema.maybe(schema.string()),
    hint: schema.maybe(schema.string()),
    icon: schema.maybe(schema.string()),
    accessAgreement: schema.maybe(schema.object({ message: schema.string() })),
    ...overrides,
  };
}

function getUniqueProviderSchema(
  providerType: string,
  overrides?: Partial<ProvidersCommonConfigType>
) {
  return schema.maybe(
    schema.recordOf(schema.string(), schema.object(getCommonProviderSchemaProperties(overrides)), {
      validate(config) {
        if (Object.values(config).filter((provider) => provider.enabled).length > 1) {
          return `Only one "${providerType}" provider can be configured.`;
        }
      },
    })
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
          maxRedirectURLSize: schema.byteSize({ defaultValue: '2kb' }),
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
  enabled: schema.boolean({ defaultValue: true }),
  loginAssistanceMessage: schema.string({ defaultValue: '' }),
  loginHelp: schema.maybe(schema.string()),
  cookieName: schema.string({ defaultValue: 'sid' }),
  encryptionKey: schema.conditional(
    schema.contextRef('dist'),
    true,
    schema.maybe(schema.string({ minLength: 32 })),
    schema.string({ minLength: 32, defaultValue: 'a'.repeat(32) })
  ),
  session: schema.object({
    idleTimeout: schema.nullable(schema.duration()),
    lifespan: schema.nullable(schema.duration()),
  }),
  secureCookies: schema.boolean({ defaultValue: false }),
  sameSiteCookies: schema.maybe(
    schema.oneOf([schema.literal('Strict'), schema.literal('Lax'), schema.literal('None')])
  ),
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
          },
        },
        token: undefined,
        saml: undefined,
        oidc: undefined,
        pki: undefined,
        kerberos: undefined,
      },
    }),
    oidc: providerOptionsSchema('oidc', schema.object({ realm: schema.string() })),
    saml: providerOptionsSchema(
      'saml',
      schema.object({
        realm: schema.string(),
        maxRedirectURLSize: schema.byteSize({ defaultValue: '2kb' }),
      })
    ),
    http: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      autoSchemesEnabled: schema.boolean({ defaultValue: true }),
      schemes: schema.arrayOf(schema.string(), { defaultValue: ['apikey'] }),
    }),
  }),
  audit: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export function createConfig(
  config: TypeOf<typeof ConfigSchema>,
  logger: Logger,
  { isTLSEnabled }: { isTLSEnabled: boolean }
) {
  let encryptionKey = config.encryptionKey;
  if (encryptionKey === undefined) {
    logger.warn(
      'Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on ' +
        'restart, please set xpack.security.encryptionKey in kibana.yml'
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
  const providers = (isUsingLegacyProvidersFormat
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
    : config.authc.providers) as ProvidersConfigType;

  // Remove disabled providers and sort the rest.
  const sortedProviders: Array<{
    type: keyof ProvidersConfigType;
    name: string;
    order: number;
  }> = [];
  for (const [type, providerGroup] of Object.entries(providers)) {
    for (const [name, { enabled, order }] of Object.entries(providerGroup ?? {})) {
      if (!enabled) {
        delete providerGroup![name];
      } else {
        sortedProviders.push({ type: type as any, name, order });
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

  return {
    ...config,
    authc: {
      selector: { ...config.authc.selector, enabled: isLoginSelectorEnabled },
      providers,
      sortedProviders: Object.freeze(sortedProviders),
      http: config.authc.http,
    },
    encryptionKey,
    secureCookies,
  };
}
