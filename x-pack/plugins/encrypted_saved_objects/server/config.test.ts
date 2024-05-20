/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: false })).toMatchInlineSnapshot(`
      Object {
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);

    expect(ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true }))
      .toMatchInlineSnapshot(`
      Object {
        "encryptionKey": "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
        "keyRotation": Object {
          "decryptionOnlyKeys": Array [],
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: true })).toMatchInlineSnapshot(`
      Object {
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

  it('should not allow `null` value for the encryption key', () => {
    expect(() => ConfigSchema.validate({ encryptionKey: null })).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: expected value of type [string] but got [null]"`
    );

    expect(() =>
      ConfigSchema.validate({ encryptionKey: null }, { dist: true })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: expected value of type [string] but got [null]"`
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
