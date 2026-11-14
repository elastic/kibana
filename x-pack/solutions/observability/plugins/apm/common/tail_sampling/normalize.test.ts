/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { normalizeTailSamplingConfig } from './normalize';

describe('normalizeTailSamplingConfig', () => {
  it('sorts object keys at every level', () => {
    const normalized = normalizeTailSamplingConfig({
      policies: [{ type: 'latency', name: 'slow', latency: { upper_threshold_ms: 2, threshold_ms: 1 } }],
    });
    expect(JSON.stringify(normalized)).toBe(
      '{"policies":[{"latency":{"threshold_ms":1,"upper_threshold_ms":2},"name":"slow","type":"latency"}]}'
    );
  });

  it('keeps array order', () => {
    const policies = [
      { name: 'b', type: 'always_sample' },
      { name: 'a', type: 'always_sample' },
    ];
    expect(normalizeTailSamplingConfig({ policies }).policies.map((p) => p.name)).toEqual([
      'b',
      'a',
    ]);
  });

  it('does not change the input', () => {
    const input = { b: 1, a: 2 };
    normalizeTailSamplingConfig(input);
    expect(Object.keys(input)).toEqual(['b', 'a']);
  });
});
