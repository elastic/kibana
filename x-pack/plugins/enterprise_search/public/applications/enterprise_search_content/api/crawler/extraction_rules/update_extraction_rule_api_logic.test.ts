/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../../__mocks__/kea_logic';

import { updateExtractionRule } from './update_extraction_rule_api_logic';

describe('UpdateExtractionRuleApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateExtractionRule', () => {
    it('calls correct api', async () => {
      const domainId = 'domain-id';
      const extractionRuleId = 'extraction_rule_id';
      const indexName = 'elastic-crawler';
      const rule = { fakeRule: 'fake' } as any;
      http.put.mockReturnValue(Promise.resolve('result'));

      const result = updateExtractionRule({
        domainId,
        indexName,
        rule,
      });
      expect(http.put).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules/${extractionRuleId}`,
        { body: JSON.stringify({ extraction_rule: rule }) }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
