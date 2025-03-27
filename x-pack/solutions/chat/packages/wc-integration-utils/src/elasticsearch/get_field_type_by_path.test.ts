/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { getFieldTypeByPath } from './get_field_type_by_path';

describe('getFieldTypeByPath', () => {
  it('returns the type for a top level field', () => {
    const mappings: MappingTypeMapping = {
      properties: {
        content: {
          type: 'text',
        },
        category: {
          type: 'keyword',
        },
      },
    };

    const type = getFieldTypeByPath({ fieldPath: 'content', mappings });

    expect(type).toEqual('text');
  });

  it('returns the type for a nested field', () => {
    const mappings: MappingTypeMapping = {
      properties: {
        nested: {
          type: 'object',
          properties: {
            category: { type: 'keyword' },
          },
        },
        category: {
          type: 'keyword',
        },
      },
    };

    const type = getFieldTypeByPath({ fieldPath: 'nested.category', mappings });

    expect(type).toEqual('keyword');
  });
});
