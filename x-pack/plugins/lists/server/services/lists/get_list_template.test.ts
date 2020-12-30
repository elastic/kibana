/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListTemplate } from './get_list_template';

jest.mock('./list_mappings.json', () => ({
  listMappings: {},
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
      mappings: { listMappings: {} },
      settings: { index: { lifecycle: { name: 'some_index', rollover_alias: 'some_index' } } },
    });
  });
});
