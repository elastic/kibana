/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { setRulesStates, buildRuleKey } from './utils';

describe('CSP Rule State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set rules states correctly', () => {
    const ruleIds = ['rule1', 'rule3'];
    const newState = true;

    const updatedRulesStates = setRulesStates(ruleIds, newState);

    expect(updatedRulesStates).toEqual({
      rule1: { muted: true },
      rule3: { muted: true },
    });
  });

  it('should build a rule key with the provided benchmarkId, benchmarkVersion, and ruleNumber', () => {
    const benchmarkId = 'randomId';
    const benchmarkVersion = 'v1';
    const ruleNumber = '001';

    const result = buildRuleKey(benchmarkId, benchmarkVersion, ruleNumber);

    expect(result).toBe(`${benchmarkId};${benchmarkVersion};${ruleNumber}`);
  });
});
