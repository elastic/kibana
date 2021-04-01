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

  beforeEach(() => jest.resetAllMocks());
  test('should call alertingFrameworkHealth API', async () => {
    const result = await alertingFrameworkHealth({ http });
    expect(result).toEqual(undefined);
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/_health",
        ],
      ]
    `);
  });
});
