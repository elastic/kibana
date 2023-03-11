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

import { deleteExtractionRule } from './delete_extraction_rule_api_logic';

describe('DeleteExtractionRuleApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('deleteExtractionRule', () => {
    it('calls correct api', async () => {
      const domainId = 'domain-id';
      const indexName = 'elastic-crawler';
      const extractionRuleId = 'extraction_rule_id';
      http.delete.mockReturnValue(Promise.resolve('result'));

      const result = deleteExtractionRule({
        domainId,
        extractionRuleId,
        indexName,
      });
      expect(http.delete).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules/${extractionRuleId}`
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
