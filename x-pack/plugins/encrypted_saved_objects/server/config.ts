/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from 'src/core/server';

export type ConfigType = ReturnType<typeof createConfig>;

export const ConfigSchema = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    encryptionKey: schema.conditional(
      schema.contextRef('dist'),
      true,
      schema.maybe(schema.string({ minLength: 32 })),
      schema.string({ minLength: 32, defaultValue: 'a'.repeat(32) })
    ),
    keyRotation: schema.object({
      decryptionOnlyKeys: schema.arrayOf(schema.string({ minLength: 32 }), { defaultValue: [] }),
    }),
  },
  {
    validate(value) {
      const decryptionOnlyKeys = value.keyRotation?.decryptionOnlyKeys ?? [];
      if (value.encryptionKey && decryptionOnlyKeys.includes(value.encryptionKey)) {
        return '`keyRotation.decryptionOnlyKeys` cannot contain primary encryption key specified in `encryptionKey`.';
      }
    },
  }
);

export function createConfig(config: TypeOf<typeof ConfigSchema>, logger: Logger) {
  let encryptionKey = config.encryptionKey;
  const usingEphemeralEncryptionKey = encryptionKey === undefined;
  if (encryptionKey === undefined) {
    logger.warn(
      'Generating a random key for xpack.encryptedSavedObjects.encryptionKey. ' +
        'To decrypt encrypted saved objects attributes after restart, ' +
        'please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-key command.'
    );

    encryptionKey = crypto.randomBytes(16).toString('hex');
  }

  return {
    ...config,
    encryptionKey,
    usingEphemeralEncryptionKey,
  };
}
