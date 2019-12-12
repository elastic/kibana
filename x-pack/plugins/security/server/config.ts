/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;

function getCommonProviderSchemaProperties(providerType: string) {
  return {
    enabled: schema.boolean({ defaultValue: true }),
    order: schema.number({ min: 0 }),
    description: schema.string({ defaultValue: providerType }),
  };
}

function getUniqueProviderSchema(providerType: string) {
  return schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object(getCommonProviderSchemaProperties(providerType)),
      {
        validate(config) {
          if (Object.values(config).filter(provider => provider.enabled).length > 1) {
            return `Only one "${providerType}" provider can be configured.`;
          }
        },
      }
    )
  );
}

const providersConfigSchema = schema.object(
  {
    basic: getUniqueProviderSchema('basic'),
    token: getUniqueProviderSchema('token'),
    kerberos: getUniqueProviderSchema('kerberos'),
    pki: getUniqueProviderSchema('pki'),
    saml: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({
          ...getCommonProviderSchemaProperties('saml'),
          realm: schema.string(),
          maxRedirectURLSize: schema.byteSize({ defaultValue: '2kb' }),
        })
      )
    ),
    oidc: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({ ...getCommonProviderSchemaProperties('oidc'), realm: schema.string() })
      )
    ),
  },
  {
    defaultValue: {
      basic: { basic: { enabled: true, order: 0, description: 'basic' } },
      token: undefined,
      saml: undefined,
      oidc: undefined,
      pki: undefined,
      kerberos: undefined,
    },
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
  authc: schema.object({
    selector: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
    providers: providersConfigSchema,
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

export function createConfig$(context: PluginInitializerContext, isTLSEnabled: boolean) {
  return context.config.create<TypeOf<typeof ConfigSchema>>().pipe(
    map(config => {
      const logger = context.logger.get('config');

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

      // Remove disabled providers and sort the rest.
      const sortedProviders: Array<{
        type: keyof TypeOf<typeof providersConfigSchema>;
        name: string;
        options: { order: number; description: string };
      }> = [];
      for (const [type, providerGroup] of Object.entries(config.authc.providers)) {
        for (const [name, { enabled, order, description }] of Object.entries(providerGroup ?? {})) {
          if (!enabled) {
            delete providerGroup![name];
          } else {
            sortedProviders.push({ type: type as any, name, options: { order, description } });
          }
        }
      }

      sortedProviders.sort(({ options: { order: orderA } }, { options: { order: orderB } }) =>
        orderA < orderB ? -1 : orderA > orderB ? 1 : 0
      );

      return {
        ...config,
        authc: { ...config.authc, sortedProviders: Object.freeze(sortedProviders) },
        encryptionKey,
        secureCookies,
      };
    })
  );
}
