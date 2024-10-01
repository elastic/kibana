/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SaveTimelineCallout } from './save_timeline';
import { SAVE_TIMELINE_BUTTON_TEST_ID, SAVE_TIMELINE_CALLOUT_TEST_ID } from './test_ids';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { TimelineId } from '../../../../common/types';

describe('SaveTimelineCallout', () => {
  it('should render the callout and save components', () => {
    const mockStore = createMockStore({
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          ...mockGlobalState.timeline.timelineById,
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById[TimelineId.test],
          },
        },
      },
    });

    const { getByTestId, getByText, getAllByText } = render(
      <TestProviders store={mockStore}>
        <SaveTimelineCallout />
      </TestProviders>
    );

    expect(getByTestId(SAVE_TIMELINE_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Save timeline')).toHaveLength(2);
    expect(
      getByText('You need to save your timeline before creating notes for it.')
    ).toBeInTheDocument();
    expect(getByTestId(SAVE_TIMELINE_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
