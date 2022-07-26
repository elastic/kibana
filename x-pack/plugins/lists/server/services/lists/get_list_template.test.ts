/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListTemplate } from './get_list_template';

jest.mock('./list_mappings.json', () => ({
  dynamic: 'strict',
  properties: {},
}));

describe('get_list_template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list template with the string filled in', async () => {
    const template = getListTemplate('some_index');
    expect(template).toEqual({
      index_patterns: ['some_index-*'],
      template: {
        mappings: { dynamic: 'strict', properties: {} },
        settings: {
          index: { lifecycle: { name: 'some_index', rollover_alias: 'some_index' } },
          mapping: { total_fields: { limit: 10000 } },
        },
      },
    });
  });
});
