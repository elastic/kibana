/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { schema, Type, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;

const providerOptionsSchema = (providerType: string, optionsSchema: Type<any>) =>
  schema.conditional(
    schema.siblingRef('providers'),
    schema.arrayOf(schema.string(), {
      validate: providers => (!providers.includes(providerType) ? 'error' : undefined),
    }),
    optionsSchema,
    schema.never()
  );

export const ConfigSchema = schema.object(
  {
    cookieName: schema.string({ defaultValue: 'sid' }),
    encryptionKey: schema.conditional(
      schema.contextRef('dist'),
      true,
      schema.maybe(schema.string({ minLength: 32 })),
      schema.string({ minLength: 32, defaultValue: 'a'.repeat(32) })
    ),
    sessionTimeout: schema.oneOf([schema.number(), schema.literal(null)], { defaultValue: null }),
    secureCookies: schema.boolean({ defaultValue: false }),
    public: schema.object({
      protocol: schema.maybe(schema.oneOf([schema.literal('http'), schema.literal('https')])),
      hostname: schema.maybe(schema.string({ hostname: true })),
      port: schema.maybe(schema.number({ min: 0, max: 65535 })),
    }),
    authc: schema.object({
      providers: schema.arrayOf(schema.string(), { defaultValue: ['basic'], minSize: 1 }),
      oidc: providerOptionsSchema('oidc', schema.maybe(schema.object({ realm: schema.string() }))),
      saml: providerOptionsSchema(
        'saml',
        schema.maybe(schema.object({ realm: schema.maybe(schema.string()) }))
      ),
    }),
  },
  // This option should be removed as soon as we entirely migrate config from legacy Security plugin.
  { allowUnknowns: true }
);

// HACK: Since new platform doesn't support config deprecation transformations yet (e.g. `rename`), we have to handle
// them manually here for the time being. Legacy platform config will log corresponding deprecation warnings.
const origValidate = ConfigSchema.validate;
ConfigSchema.validate = (value, context, namespace) => {
  // Rename deprecated `xpack.security.authProviders` to `xpack.security.authc.providers`.
  if (value && value.authProviders) {
    value.authc = {
      ...(value.authc || {}),
      providers: value.authProviders,
    };

    delete value.authProviders;
  }

  return origValidate.call(ConfigSchema, value, context, namespace);
};

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

      return { ...config, encryptionKey, secureCookies };
    })
  );
}
