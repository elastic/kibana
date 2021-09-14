/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateFormErrors } from './auto_follow_pattern_form';

jest.mock('../services/auto_follow_pattern_validators', () => ({
  validateAutoFollowPattern: jest.fn(),
  validateLeaderIndexPattern: jest.fn(),
}));

describe('<AutoFollowPatternForm state update', () => {
  describe('updateFormErrors()', () => {
    it('should merge errors with existing fieldsErrors', () => {
      const errors = { name: 'Some error' };
      const existingErrors = { leaderIndexPatterns: null };
      const output = updateFormErrors(errors, existingErrors);
      expect(output).toMatchSnapshot();
    });
  });
});
