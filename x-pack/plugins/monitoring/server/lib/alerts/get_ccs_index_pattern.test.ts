/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCcsIndexPattern } from './get_ccs_index_pattern';

describe('getCcsIndexPattern', () => {
  it('should return an index pattern from multiple index patterns including CCS globs', () => {
    const availableCcs = true;
    const index = '.monitoring-es-*,.monitoring-kibana-*';
    const result = getCcsIndexPattern(index, availableCcs);
    expect(result).toBe(
      '.monitoring-es-*,.monitoring-kibana-*,*:.monitoring-es-*,*:.monitoring-kibana-*'
    );
  });
});
