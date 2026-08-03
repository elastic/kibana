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

  it('normalizes non-array values to arrays', () => {
    const nonArrayFields = {
      'host.name': 'my-host',
      'service.version': 42,
      'agent.name': ['nodejs'],
    };
    const result = getSectionsFromFields(nonArrayFields);
    expect(result).toEqual([
      {
        key: 'agent',
        label: 'agent',
        properties: [{ field: 'agent.name', value: ['nodejs'] }],
      },
      {
        key: 'host',
        label: 'host',
        properties: [{ field: 'host.name', value: ['my-host'] }],
      },
      {
        key: 'service',
        label: 'service',
        properties: [{ field: 'service.version', value: [42] }],
      },
    ]);
  });

  it('filters out null and undefined values during normalization', () => {
    const fieldsWithNulls = {
      'host.name': null,
      'service.version': undefined,
      'agent.name': ['nodejs'],
    };
    const result = getSectionsFromFields(fieldsWithNulls);
    expect(result).toEqual([
      {
        key: 'agent',
        label: 'agent',
        properties: [{ field: 'agent.name', value: ['nodejs'] }],
      },
      {
        key: 'host',
        label: 'host',
        properties: [{ field: 'host.name', value: [] }],
      },
      {
        key: 'service',
        label: 'service',
        properties: [{ field: 'service.version', value: [] }],
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

    it('does not throw when value is a non-array primitive', () => {
      const sectionsWithPrimitive = [
        {
          key: 'host',
          label: 'host',
          properties: [{ field: 'host.name', value: 'my-host' as unknown as string[] }],
        },
      ];
      expect(() => filterSectionsByTerm(sectionsWithPrimitive, 'my')).not.toThrow();
      expect(filterSectionsByTerm(sectionsWithPrimitive, 'my')).toEqual([
        {
          key: 'host',
          label: 'host',
          properties: [{ field: 'host.name', value: 'my-host' }],
        },
      ]);
    });

    it('does not throw when value is undefined', () => {
      const sectionsWithUndefined = [
        {
          key: 'host',
          label: 'host',
          properties: [{ field: 'host.name', value: undefined as unknown as string[] }],
        },
      ];
      expect(() => filterSectionsByTerm(sectionsWithUndefined, 'host')).not.toThrow();
      expect(filterSectionsByTerm(sectionsWithUndefined, 'host')).toEqual([
        {
          key: 'host',
          label: 'host',
          properties: [{ field: 'host.name', value: undefined }],
        },
      ]);
    });
  });
});
