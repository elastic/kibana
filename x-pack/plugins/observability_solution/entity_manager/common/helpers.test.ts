/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityHistoryIndexTemplateV1, getEntityLatestIndexTemplateV1 } from './helpers';

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
});
