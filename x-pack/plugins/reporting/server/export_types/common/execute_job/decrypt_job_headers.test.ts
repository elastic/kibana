/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory, LevelLogger } from '../../../lib';
import { decryptJobHeaders } from './decrypt_job_headers';

const encryptHeaders = async (encryptionKey: string, headers: Record<string, string>) => {
  const crypto = cryptoFactory(encryptionKey);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if it can't decrypt headers`, async () => {
    const getDecryptedHeaders = () =>
      decryptJobHeaders({
        encryptionKey: 'abcsecretsauce',
        job: {
          headers: 'Q53+9A+zf+Xe+ceR/uB/aR/Sw/8e+M+qR+WiG+8z+EY+mo+HiU/zQL+Xn',
        },
        logger: ({
          error: jest.fn(),
        } as unknown) as LevelLogger,
      });
    await expect(getDecryptedHeaders()).rejects.toMatchInlineSnapshot(
      `[Error: Failed to decrypt report job data. Please ensure that xpack.reporting.encryptionKey is set and re-generate this report. Error: Invalid IV length]`
    );
  });

  test(`passes back decrypted headers that were passed in`, async () => {
    const headers = {
      foo: 'bar',
      baz: 'quix',
    };

    const encryptedHeaders = await encryptHeaders('abcsecretsauce', headers);
    const decryptedHeaders = await decryptJobHeaders({
      encryptionKey: 'abcsecretsauce',
      job: {
        title: 'cool-job-bro',
        type: 'csv',
        headers: encryptedHeaders,
      },
      logger: {} as LevelLogger,
    });
    expect(decryptedHeaders).toEqual(headers);
  });
});
