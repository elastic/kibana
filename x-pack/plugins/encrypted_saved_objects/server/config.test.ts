/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import { first } from 'rxjs/operators';
import { loggingServiceMock, coreMock } from 'src/core/server/mocks';
import { createConfig$, ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }
    `);

    expect(ConfigSchema.validate({}, { dist: false })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }
    `);

    expect(ConfigSchema.validate({}, { dist: true })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
      }
    `);
  });

  it('should throw error if xpack.encryptedSavedObjects.encryptionKey is less than 32 characters', () => {
    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value is [foo] but it must have a minimum length of [32]."`
    );

    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' }, { dist: true })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value is [foo] but it must have a minimum length of [32]."`
    );
  });
});

describe('createConfig$()', () => {
  it('should log a warning and set xpack.encryptedSavedObjects.encryptionKey if not set', async () => {
    const mockRandomBytes = jest.requireMock('crypto').randomBytes;
    mockRandomBytes.mockReturnValue('ab'.repeat(16));

    const contextMock = coreMock.createPluginInitializerContext({});
    const config = await createConfig$(contextMock)
      .pipe(first())
      .toPromise();
    expect(config).toEqual({ encryptionKey: 'ab'.repeat(16) });

    expect(loggingServiceMock.collect(contextMock.logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Generating a random key for xpack.encryptedSavedObjects.encryptionKey. To be able to decrypt encrypted saved objects attributes after restart, please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml",
        ],
      ]
    `);
  });
});
