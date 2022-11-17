/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadAllActions } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadAllActions', () => {
  test('should call getAll actions API', async () => {
    http.get.mockResolvedValueOnce([]);

    const result = await loadAllActions({ http });
    expect(result).toEqual([]);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connectors",
      ]
    `);
  });
});
