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

import { addExtractionRule } from './add_extraction_rule_api_logic';

describe('AddExtractionRuleApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('addExtractionRule', () => {
    it('calls correct api', async () => {
      const domainId = 'domain-id';
      const indexName = 'elastic-crawler';
      const rule = { fakeRule: 'fake' } as any;
      http.post.mockReturnValue(Promise.resolve('result'));

      const result = addExtractionRule({
        domainId,
        indexName,
        rule,
      });
      expect(http.post).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules`,
        { body: JSON.stringify({ extraction_rule: rule }) }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
