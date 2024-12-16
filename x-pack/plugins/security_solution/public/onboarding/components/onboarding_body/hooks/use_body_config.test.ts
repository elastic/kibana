/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useBodyConfig } from './use_body_config';
import { mockOnboardingContext, onboardingContext } from '../../__mocks__/mocks';

const topicId = 'topic-id';
const mockUseTopicId = jest.fn(() => topicId);
jest.mock('../../hooks/use_topic_id', () => ({
  useTopicId: () => mockUseTopicId(),
}));

const defaultBodyConfig = [{ title: 'Default Group 1', cards: [] }];
const bodyConfig = [{ title: 'Group 1', cards: [] }];
const config = new Map([
  ['default', { body: defaultBodyConfig }],
  [topicId, { body: bodyConfig }],
]);

jest.mock('../../onboarding_context');

describe('useBodyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the selected topic does not have a body config', () => {
    beforeEach(() => {
      mockOnboardingContext.mockReturnValue({ ...onboardingContext, config: new Map() });
    });

    it('should return an empty array', () => {
      const { result } = renderHook(() => useBodyConfig());
      expect(result.current).toEqual([]);
    });
  });

  describe('when the selected topic has a body config', () => {
    beforeEach(() => {
      mockOnboardingContext.mockReturnValue({ ...onboardingContext, config });
    });

    it('should return the body config for the selected topic', () => {
      const { result } = renderHook(() => useBodyConfig());
      expect(result.current).toEqual(bodyConfig);
    });
  });

  describe('when the selected topic does not exist (not expected)', () => {
    beforeEach(() => {
      mockUseTopicId.mockReturnValue('non-existent-topic');
      mockOnboardingContext.mockReturnValue({ ...onboardingContext, config });
    });

    it('should return the body config for the selected topic', () => {
      const { result } = renderHook(() => useBodyConfig());
      expect(result.current).toEqual([]);
    });
  });
});
