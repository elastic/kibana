/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getPoliciesHash } from './get_policies_hash';

describe('getPoliciesHash', () => {
  it('returns a sha256 hex digest', () => {
    expect(getPoliciesHash([{ name: 'a', type: 'always_sample' }])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives the same hash whatever the key order, at every level', () => {
    const a = [{ name: 'p', type: 'status_code', status_code: { status_codes: ['ERROR'] } }];
    const b = [{ status_code: { status_codes: ['ERROR'] }, type: 'status_code', name: 'p' }];
    expect(getPoliciesHash(a)).toBe(getPoliciesHash(b));
  });

  it('gives a different hash when the policy order changes', () => {
    const first = { name: 'a', type: 'always_sample' };
    const second = { name: 'b', type: 'always_sample' };
    expect(getPoliciesHash([first, second])).not.toBe(getPoliciesHash([second, first]));
  });

  it('gives a different hash when a value changes', () => {
    const base = { name: 'p', type: 'probabilistic', probabilistic: { sampling_percentage: 10 } };
    const changed = { ...base, probabilistic: { sampling_percentage: 20 } };
    expect(getPoliciesHash([base])).not.toBe(getPoliciesHash([changed]));
  });
});
