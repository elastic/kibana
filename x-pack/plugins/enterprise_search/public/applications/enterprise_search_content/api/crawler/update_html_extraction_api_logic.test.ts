/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { updateHtmlExtraction } from './update_html_extraction_api_logic';

describe('UpdateHtmlExtractionApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateHtmlExtraction', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';

      http.get.mockReturnValue(Promise.resolve());

      const result = updateHtmlExtraction({ htmlExtraction: true, indexName });

      expect(http.put).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler/html_extraction`,
        {
          body: JSON.stringify({
            extract_full_html: true,
          }),
        }
      );
      await expect(result).resolves.toEqual({ htmlExtraction: true });
    });
  });
});
