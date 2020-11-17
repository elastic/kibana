/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import { loggingSystemMock } from 'src/core/server/mocks';
import { createConfig, ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: false })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: true })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);
  });

  it('properly validates config', () => {
    expect(
      ConfigSchema.validate(
        {
          encryptionKey: 'a'.repeat(32),
          keyRotation: { decryptionOnlyKeys: ['b'.repeat(32), 'c'.repeat(32)] },
        },
        { dist: true }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "cccccccccccccccccccccccccccccccc",
          ],
        },
      }
    `);
  });

  it('should throw error if xpack.encryptedSavedObjects.encryptionKey is less than 32 characters', () => {
    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value has length [3] but it must have a minimum length of [32]."`
    );

    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' }, { dist: true })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value has length [3] but it must have a minimum length of [32]."`
    );
  });

  it('should throw error if any of the xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys is less than 32 characters', () => {
    expect(() =>
      ConfigSchema.validate({
        keyRotation: { decryptionOnlyKeys: ['a'.repeat(32), 'b'.repeat(31)] },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[keyRotation.decryptionOnlyKeys.1]: value has length [31] but it must have a minimum length of [32]."`
    );

    expect(() =>
      ConfigSchema.validate(
        { keyRotation: { decryptionOnlyKeys: ['a'.repeat(32), 'b'.repeat(31)] } },
        { dist: true }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"[keyRotation.decryptionOnlyKeys.1]: value has length [31] but it must have a minimum length of [32]."`
    );
  });

  it('should throw error if any of the xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys is equal to xpack.encryptedSavedObjects.encryptionKey', () => {
    expect(() =>
      ConfigSchema.validate({
        encryptionKey: 'a'.repeat(32),
        keyRotation: { decryptionOnlyKeys: ['a'.repeat(32)] },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`keyRotation.decryptionOnlyKeys\` cannot contain primary encryption key specified in \`encryptionKey\`."`
    );

    expect(() =>
      ConfigSchema.validate(
        {
          encryptionKey: 'a'.repeat(32),
          keyRotation: { decryptionOnlyKeys: ['a'.repeat(32)] },
        },
        { dist: true }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`keyRotation.decryptionOnlyKeys\` cannot contain primary encryption key specified in \`encryptionKey\`."`
    );
  });
});

describe('createConfig()', () => {
  it('should log a warning, set xpack.encryptedSavedObjects.encryptionKey and usingEphemeralEncryptionKey=true when encryptionKey is not set', () => {
    const mockRandomBytes = jest.requireMock('crypto').randomBytes;
    mockRandomBytes.mockReturnValue('ab'.repeat(16));

    const logger = loggingSystemMock.create().get();
    const config = createConfig(ConfigSchema.validate({}, { dist: true }), logger);
    expect(config).toEqual({
      enabled: true,
      encryptionKey: 'ab'.repeat(16),
      keyRotation: { decryptionOnlyKeys: [] },
      usingEphemeralEncryptionKey: true,
    });

    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Generating a random key for xpack.encryptedSavedObjects.encryptionKey. To decrypt encrypted saved objects attributes after restart, please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.",
        ],
      ]
    `);
  });

  it('should not log a warning and set usingEphemeralEncryptionKey=false when encryptionKey is set', async () => {
    const logger = loggingSystemMock.create().get();
    const config = createConfig(
      ConfigSchema.validate({ encryptionKey: 'supersecret'.repeat(3) }, { dist: true }),
      logger
    );
    expect(config).toEqual({
      enabled: true,
      encryptionKey: 'supersecret'.repeat(3),
      keyRotation: { decryptionOnlyKeys: [] },
      usingEphemeralEncryptionKey: false,
    });

    expect(loggingSystemMock.collect(logger).warn).toEqual([]);
  });
});
