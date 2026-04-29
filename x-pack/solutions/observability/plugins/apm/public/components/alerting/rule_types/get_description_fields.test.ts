/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuildFieldsMap } from '@kbn/triggers-actions-ui-plugin/public/types';
import { getDescriptionFields } from './get_description_fields';

describe('getDescriptionFields', () => {
  const mockPrebuildField = jest.fn();
  const mockPrebuildFields = {
    customQuery: mockPrebuildField,
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when rule is not provided', () => {
    const result = getDescriptionFields({
      // @ts-expect-error Testing undefined rule
      rule: undefined,
      prebuildFields: mockPrebuildFields,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when prebuildFields is not provided', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          query: {
            query: '_id: *',
          },
        },
      },
    } as unknown as Parameters<typeof getDescriptionFields>[0]['rule'];

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: undefined,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when both rule and prebuildFields are not provided', () => {
    const result = getDescriptionFields({
      // @ts-expect-error Testing undefined rule
      rule: undefined,
      prebuildFields: undefined,
    });

    expect(result).toEqual([]);
  });

  it('should return the custom query', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          query: {
            query: '_id: *',
          },
        },
      },
    } as unknown as Parameters<typeof getDescriptionFields>[0]['rule'];

    const mockReturnValue = { type: 'customQuery', value: '_id: *' };
    mockPrebuildField.mockReturnValue(mockReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
    });

    expect(mockPrebuildField).toHaveBeenCalledWith('_id: *');
    expect(result).toEqual([mockReturnValue]);
  });
});
