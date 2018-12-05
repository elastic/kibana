/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateFormValues, updateFormErrors } from './auto_follow_pattern_form';

jest.mock('../services/auto_follow_pattern_validators', () => ({
  validateAutoFollowPattern: jest.fn(),
  validateLeaderIndexPattern: jest.fn()
}));

describe('<AutoFollowPatternForm state update', () => {
  describe('updateFormValues()', () => {
    it('should merge fields with existing state', () => {
      const fields = { name: 'new value' };
      const state = { autoFollowPattern: { name: 'bar', leaderIndexPatterns: ['should not be modified'] } };
      const output = updateFormValues(fields)(state);
      expect(output).toMatchSnapshot();
    });

    it('should merge leaderIndexPatterns into the existing array', () => {
      const fields = { leaderIndexPatterns: 'should be merged' };
      const state = { autoFollowPattern: { name: 'should not be modified', leaderIndexPatterns: ['bar'] } };
      const output = updateFormValues(fields)(state);
      expect(output).toMatchSnapshot();
    });

    it('should replace leaderIndexPatterns value when an Array is provided', () => {
      const fields = { leaderIndexPatterns: ['new array to replace old one'] };
      const state = { autoFollowPattern: { name: 'foo', leaderIndexPatterns: ['bar'] } };
      const output = updateFormValues(fields)(state);
      expect(output).toMatchSnapshot();
    });
  });

  describe('updateFormErrors()', () => {
    it('should merge errors with existing fieldsErrors', () => {
      const errors = { name: { message: 'Some error' } };
      const state = { fieldsErrors: { leaderIndexPatterns: null } };
      const output = updateFormErrors(errors)(state);
      expect(output).toMatchSnapshot();
    });
  });
});
