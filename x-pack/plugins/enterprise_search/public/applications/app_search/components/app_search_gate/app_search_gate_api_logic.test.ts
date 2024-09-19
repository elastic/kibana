/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { sendAppSearchGatedFormData } from './app_search_gate_api_logic';

describe('AppSearchGatedFormApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('sendAppSearchGatedFormData', () => {
    it('calls correct api', async () => {
      const asFormData = {
        additionalFeedback: 'my-test-additional-data',
        feature: 'Web Crawler',
        featuresOther: null,
        participateInUXLabs: null,
      };
      const promise = Promise.resolve();
      http.put.mockReturnValue(promise);
      sendAppSearchGatedFormData(asFormData);
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/app_search/as_gate', {
        body: '{"as_gate_data":{"additional_feedback":"my-test-additional-data","feature":"Web Crawler"}}',
      });
    });
  });
});
