/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { validateAutoFollowPattern } from './auto_follow_pattern_validators';

jest.mock('ui/index_patterns/index_patterns.js', () => ({ IndexPatternsProvider: jest.fn() }));
jest.mock('ui/index_patterns/index_patterns_api_client_provider.js', () => ({ IndexPatternsApiClientProvider: jest.fn() }));

describe('Auto-follow pattern validators', () => {
  describe('validateAutoFollowPattern()', () => {
    it('should set default errors when autoFollowPattern is undefined', () => {
      const output = validateAutoFollowPattern();
      expect(output.name).not.toBe(null);
      expect(output.leaderIndexPatterns).not.toBe(null);
      expect(output.followIndexPatternPrefix).toBe(null);
      expect(output.followIndexPatternSuffix).toBe(null);
      expect(output).toMatchSnapshot();
    });

    it('should validate all props from auto-follow patten', () => {
      const autoFollowPattern = {
        name: '_wrong-name',
        leaderIndexPatterns: ['wrong\pattern'],
        followIndexPatternPrefix: 'pre?fix_',
        followIndexPatternSuffix: '_suf?fix',
        otherProp: 'foo'
      };
      const output = validateAutoFollowPattern(autoFollowPattern);
      expect(output.otherProp).toBe(null);
      expect(output).toMatchSnapshot();
    });
  });
});
