/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomPipelineNameForDatastream } from './datastream_es_name';

describe('getCustomPipelineNameForDatastream', () => {
  it('return the correct custom pipeline for datastream', () => {
    const res = getCustomPipelineNameForDatastream({
      type: 'logs',
      dataset: 'test',
    } as any);

    expect(res).toBe('logs-test@custom');
  });
});
