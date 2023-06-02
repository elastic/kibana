/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../../__mocks__/kea_logic';

import { fetchExtractionRules } from './fetch_extraction_rules_api_logic';

describe('FetchExtractionRuleApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchExtractionRule', () => {
    it('calls correct api', async () => {
      const domainId = 'domain-id';
      const indexName = 'elastic-crawler';
      http.get.mockReturnValue(Promise.resolve('result'));

      const result = fetchExtractionRules({
        domainId,
        indexName,
      });
      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules`
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
