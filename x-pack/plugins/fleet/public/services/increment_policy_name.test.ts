/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { incrementPolicyName } from './increment_policy_name';
describe('increment policy name', () => {
  it('should return index 1 when no policies', () => {
    const name = incrementPolicyName([]);
    expect(name).toEqual('Agent policy 1');
  });

  it('should return index 1 when policies with other name', () => {
    const name = incrementPolicyName([{ name: 'policy' } as any]);
    expect(name).toEqual('Agent policy 1');
  });

  it('should return index 2 when policy 1 exists', () => {
    const name = incrementPolicyName([{ name: 'Agent policy 1' } as any]);
    expect(name).toEqual('Agent policy 2');
  });

  it('should return index 11 when policy 10 is max', () => {
    const name = incrementPolicyName([
      { name: 'Agent policy 10' } as any,
      { name: 'Agent policy 9' } as any,
      { name: 'policy' } as any,
    ]);
    expect(name).toEqual('Agent policy 11');
  });

  it('should return index 2 when policy 1 exists - fleet server', () => {
    const name = incrementPolicyName([{ name: 'Fleet Server policy 1' } as any], true);
    expect(name).toEqual('Fleet Server policy 2');
  });
});
