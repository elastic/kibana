/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListsTemplate } from './get_lists_template';

jest.mock('./lists_mappings.json', () => ({
  listsMappings: {},
}));

describe('get_lists_template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list template with the string filled in', async () => {
    const template = getListsTemplate('some_index');
    expect(template).toEqual({
      index_patterns: ['some_index-*'],
      mappings: { listsMappings: {} },
      settings: { index: { lifecycle: { name: 'some_index', rollover_alias: 'some_index' } } },
    });
  });
});
