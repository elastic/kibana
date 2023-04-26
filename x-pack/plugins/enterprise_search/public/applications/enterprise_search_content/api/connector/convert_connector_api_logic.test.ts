/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { convertConnector } from './convert_connector_api_logic';

describe('ConvertConnectorApilogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('convertConnector', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = convertConnector({ connectorId: 'connectorId1' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connectorId1/native',
        { body: JSON.stringify({ is_native: true }) }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
