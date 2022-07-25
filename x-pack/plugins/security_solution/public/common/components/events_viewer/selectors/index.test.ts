/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockState } from './mock_state';

import { eventsViewerSelector } from '.';

describe('selectors', () => {
  describe('eventsViewerSelector', () => {
    it('returns the expected results', () => {
      const id = 'detections-page';

      expect(eventsViewerSelector(mockState, id)).toEqual({
        filters: mockState.inputs.global.filters,
        input: mockState.inputs.timeline,
        query: mockState.inputs.global.query,
        globalQueries: mockState.inputs.global.queries,
        timelineQuery: mockState.inputs.timeline.queries[0],
        timeline: mockState.timeline.timelineById[id],
      });
    });
  });
});
