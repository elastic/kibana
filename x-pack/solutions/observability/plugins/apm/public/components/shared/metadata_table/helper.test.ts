/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterSectionsByTerm, getSectionsFromFields } from './helper';

describe('MetadataTable Helper', () => {
  const fields = {
    'http.headers.Connection': ['close'],
    'http.headers.Host': ['opbeans:3000'],
    'http.headers.request.method': ['get'],
    'service.framework.name': ['express'],
    'service.environment': ['production'],
  };

  const metadataItems = getSectionsFromFields(fields);

  it('returns flattened data', () => {
    expect(metadataItems).toEqual([
      {
        key: 'http',
        label: 'http',
        properties: [
          { field: 'http.headers.Connection', value: ['close'] },
          { field: 'http.headers.Host', value: ['opbeans:3000'] },
          { field: 'http.headers.request.method', value: ['get'] },
        ],
      },
      {
        key: 'service',
        label: 'service',
        properties: [
          { field: 'service.environment', value: ['production'] },
          { field: 'service.framework.name', value: ['express'] },
        ],
      },
    ]);
  });

  describe('filter', () => {
    it('items by key', () => {
      const filteredItems = filterSectionsByTerm(metadataItems, 'http');
      expect(filteredItems).toEqual([
        {
          key: 'http',
          label: 'http',
          properties: [
            { field: 'http.headers.Connection', value: ['close'] },
            { field: 'http.headers.Host', value: ['opbeans:3000'] },
            { field: 'http.headers.request.method', value: ['get'] },
          ],
        },
      ]);
    });

    it('items by value', () => {
      const filteredItems = filterSectionsByTerm(metadataItems, 'product');
      expect(filteredItems).toEqual([
        {
          key: 'service',
          label: 'service',
          properties: [{ field: 'service.environment', value: ['production'] }],
        },
      ]);
    });

    it('returns empty when no item matches', () => {
      const filteredItems = filterSectionsByTerm(metadataItems, 'post');
      expect(filteredItems).toEqual([]);
    });
  });
});
