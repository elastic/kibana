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
      providers: schema.arrayOf(schema.string(), { defaultValue: ['basic'], minSize: 1 }),
      oidc: providerOptionsSchema('oidc', schema.maybe(schema.object({ realm: schema.string() }))),
      saml: providerOptionsSchema(
        'saml',
        schema.object({
          realm: schema.string(),
          maxRedirectURLSize: schema.byteSize({ defaultValue: '2kb' }),
        })
      ),
    }),
  },
  // This option should be removed as soon as we entirely migrate config from legacy Security plugin.
  { allowUnknowns: true }
);

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

      return {
        ...config,
        encryptionKey,
        secureCookies,
      };
    })
  );
}
