/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { alertingFrameworkHealth } from './health';

describe('alertingFrameworkHealth', () => {
  const http = httpServiceMock.createStartContract();
  test('should call alertingFrameworkHealth API', async () => {
    http.get.mockResolvedValueOnce({
      is_sufficiently_secure: true,
      has_permanent_encryption_key: true,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
    });
    const result = await alertingFrameworkHealth({ http });
    expect(result).toEqual({
      alertingFrameworkHealth: {
        decryptionHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        executionHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        readHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      hasPermanentEncryptionKey: true,
      isSufficientlySecure: true,
    });
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/_health",
        ],
      ]
    `);
  });
});
