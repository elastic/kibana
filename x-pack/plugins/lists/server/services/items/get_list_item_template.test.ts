/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListItemTemplate } from './get_list_item_template';

jest.mock('./list_item_mappings.json', () => ({
  listMappings: {},
}));

describe('get_list_item_template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list template with the string filled in', async () => {
    const template = getListItemTemplate('some_index');
    expect(template).toEqual({
      index_patterns: ['some_index-*'],
      template: {
        mappings: { listMappings: {} },
        settings: {
          index: { lifecycle: { name: 'some_index', rollover_alias: 'some_index' } },
          mapping: {
            total_fields: {
              limit: 10000,
            },
          },
        },
      },
    });
  });
});
