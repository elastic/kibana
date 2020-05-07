/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCcsIndexPattern } from './get_ccs_index_pattern';

describe('getCcsIndexPattern', () => {
  it('should return an index pattern including remotes', () => {
    const remotes = ['Remote1', 'Remote2'];
    const index = '.monitoring-es-*';
    const result = getCcsIndexPattern(index, remotes);
    expect(result).toBe('.monitoring-es-*,Remote1:.monitoring-es-*,Remote2:.monitoring-es-*');
  });

  it('should return an index pattern from multiple index patterns including remotes', () => {
    const remotes = ['Remote1', 'Remote2'];
    const index = '.monitoring-es-*,.monitoring-kibana-*';
    const result = getCcsIndexPattern(index, remotes);
    expect(result).toBe(
      '.monitoring-es-*,.monitoring-kibana-*,Remote1:.monitoring-es-*,Remote2:.monitoring-es-*,Remote1:.monitoring-kibana-*,Remote2:.monitoring-kibana-*'
    );
  });
});
