/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  AddDocumentsCodeExample,
  basicExampleTexts,
  exampleTextsWithCustomMapping,
} from './add_documents_code_example';
import { generateSampleDocument } from '../../utils/document_generation';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../../utils/language', () => ({
  getDefaultCodingLanguage: jest.fn().mockReturnValue('python'),
}));

jest.mock('../../hooks/use_asset_base_path', () => ({
  useAssetBasePath: jest.fn().mockReturnValue('/plugins/'),
}));

jest.mock('../../utils/document_generation', () => ({
  generateSampleDocument: jest.fn(),
}));

jest.mock('../../hooks/use_elasticsearch_url', () => ({
  useElasticsearchUrl: jest.fn(),
}));

jest.mock('@kbn/search-api-keys-components', () => ({
  useSearchApiKey: jest.fn().mockReturnValue({ apiKey: 'test-api-key' }),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {},
      share: {},
      console: {},
    },
  }),
}));

jest.mock('../../contexts/usage_tracker_context', () => ({
  useUsageTracker: jest.fn().mockReturnValue({
    count: jest.fn(),
    click: jest.fn(),
  }),
}));

describe('AddDocumentsCodeExample', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSampleDocument', () => {
    it('pass basic examples when mapping is default', () => {
      const indexName = 'test-index';
      const mappingProperties: Record<string, MappingProperty> = {
        vector: { type: 'dense_vector', dims: 3 },
        text: { type: 'text' },
      };

      render(
        <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />
      );

      expect(generateSampleDocument).toHaveBeenCalledTimes(3);

      basicExampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });

    it('pass basic examples when mapping is not passed', () => {
      const indexName = 'test-index';

      render(<AddDocumentsCodeExample indexName={indexName} mappingProperties={{}} />);

      expect(generateSampleDocument).toHaveBeenCalledTimes(3);

      const mappingProperties: Record<string, MappingProperty> = {
        vector: { type: 'dense_vector', dims: 3 },
        text: { type: 'text' },
      };

      basicExampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });

    it('pass basic examples when mapping is default with extra vector fields', () => {
      const indexName = 'test-index';
      const mappingProperties: Record<string, MappingProperty> = {
        vector: { type: 'dense_vector', dims: 3, extraField: 'extra' },
        text: { type: 'text' },
      };

      render(
        <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />
      );

      expect(generateSampleDocument).toHaveBeenCalledTimes(3);

      basicExampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });

    it('pass examples text when mapping is custom', () => {
      const indexName = 'test-index';
      const mappingProperties: Record<string, MappingProperty> = {
        text: { type: 'text' },
        test: { type: 'boolean' },
      };

      render(
        <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />
      );

      expect(generateSampleDocument).toHaveBeenCalledTimes(3);

      exampleTextsWithCustomMapping.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });
  });
});
