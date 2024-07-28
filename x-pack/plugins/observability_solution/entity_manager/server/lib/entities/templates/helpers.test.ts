/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityHistoryIndexTemplateV1,
  getEntityLatestIndexTemplateV1,
  getCustomHistoryTemplateComponents,
  getCustomLatestTemplateComponents,
} from './helpers';

describe('helpers', () => {
  it('getEntityHistoryIndexTemplateV1 should return the correct value', () => {
    const definitionId = 'test';
    const result = getEntityHistoryIndexTemplateV1(definitionId);
    expect(result).toEqual('entities_v1_history_test_index_template');
  });

  it('getEntityLatestIndexTemplateV1 should return the correct value', () => {
    const definitionId = 'test';
    const result = getEntityLatestIndexTemplateV1(definitionId);
    expect(result).toEqual('entities_v1_latest_test_index_template');
  });

  it('getCustomLatestTemplateComponents should return template component in the right sort order', () => {
    const definitionId = 'test';
    const result = getCustomLatestTemplateComponents(definitionId);
    expect(result).toEqual([
      'test@platform',
      'test-latest@platform',
      'test@custom',
      'test-latest@custom',
    ]);
  });

  it('getCustomHistoryTemplateComponents should return template component in the right sort order', () => {
    const definitionId = 'test';
    const result = getCustomHistoryTemplateComponents(definitionId);
    expect(result).toEqual([
      'test@platform',
      'test-history@platform',
      'test@custom',
      'test-history@custom',
    ]);
  });
});
