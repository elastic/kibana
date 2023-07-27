/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateAutoFollowPattern } from './auto_follow_pattern_validators';

describe('Auto-follow pattern validators', () => {
  describe('validateAutoFollowPattern()', () => {
    it('returns empty object when autoFollowPattern is undefined', () => {
      const errors = validateAutoFollowPattern();
      expect(errors).toMatchSnapshot();
    });

    it('should validate all props from auto-follow pattern', () => {
      const autoFollowPattern = {
        name: '_wrong-name',
        leaderIndexPatterns: ['wrongpattern'],
        followIndexPatternPrefix: 'pre?fix_',
        followIndexPatternSuffix: '_suf?fix',
        otherProp: 'foo',
      };
      const errors = validateAutoFollowPattern(autoFollowPattern);
      expect(errors).toMatchSnapshot();
    });
  });
});
