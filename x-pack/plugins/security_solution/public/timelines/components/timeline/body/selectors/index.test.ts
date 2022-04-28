/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../../../../common/mock/global_state';
import { timelineBodySelector } from '.';

describe('selectors', () => {
  describe('timelineBodySelector', () => {
    it('returns the expected results', () => {
      const expected = mockGlobalState.timeline.timelineById.test;
      const { dataViewId, documentType, defaultColumns, isLoading, queryFields, selectAll, title } =
        expected;

      const id = 'test';

      expect(timelineBodySelector(mockGlobalState, id)).toEqual({
        manageTimelineById: {
          dataViewId,
          documentType,
          defaultColumns,
          isLoading,
          queryFields,
          selectAll,
          title,
        },
        timeline: expected,
      });
    });
  });
});
