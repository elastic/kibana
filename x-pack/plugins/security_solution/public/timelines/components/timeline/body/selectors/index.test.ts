/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../../../../common/mock/global_state';
import { timelineBodySelector } from '.';
import { TimelineId } from '../../../../../../common/types/timeline';

describe('selectors', () => {
  describe('timelineBodySelector', () => {
    it('returns the expected results', () => {
      const expected = mockGlobalState.timeline.timelineById[TimelineId.test];
      const id = TimelineId.test;

      expect(timelineBodySelector(mockGlobalState, id)).toEqual({
        timeline: expected,
      });
    });
  });
});
