/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '../../../types';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadActionTypes } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadActionTypes', () => {
  test('should call get types API', async () => {
    const apiResponseValue = [
      {
        id: 'test',
        name: 'Test',
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: true,
        minimum_license_required: 'basic',
      },
    ];
    http.get.mockResolvedValueOnce(apiResponseValue);

    const resolvedValue: ActionType[] = [
      {
        id: 'test',
        name: 'Test',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      },
    ];

    const result = await loadActionTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector_types",
      ]
    `);
  });
});
