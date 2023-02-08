/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchEngineFieldCapabilities } from './fetch_engine_field_capabilities_api_logic';

describe('FetchEngineFieldCapabilitiesApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchEngineFieldCapabilities', () => {
    it('requests the field_capabilities api', async () => {
      const promise = Promise.resolve({ result: 'result' });
      http.get.mockReturnValue(promise);
      const result = fetchEngineFieldCapabilities({ engineName: 'foobar' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/enterprise_search/engines/foobar/field_capabilities'
      );
      await expect(result).resolves.toEqual({ result: 'result' });
    });
  });
});
