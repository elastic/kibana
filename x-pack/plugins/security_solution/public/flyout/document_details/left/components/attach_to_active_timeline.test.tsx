/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
  SAVE_TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { AttachToActiveTimeline } from './attach_to_active_timeline';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('../../../../common/components/user_privileges');

const mockSetAttachToTimeline = jest.fn();

describe('AttachToActiveTimeline', () => {
  it('should render the component for an unsaved timeline', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
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

    const { getByTestId, getByText, queryByTestId } = render(
      <TestProviders store={mockStore}>
        <AttachToActiveTimeline
          setAttachToTimeline={mockSetAttachToTimeline}
          isCheckboxDisabled={false}
        />
      </TestProviders>
    );

    expect(getByTestId(SAVE_TIMELINE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SAVE_TIMELINE_BUTTON_TEST_ID)).toHaveStyle('background-color: #FEC514');
    expect(getByTestId(SAVE_TIMELINE_BUTTON_TEST_ID)).toHaveTextContent('Save timeline');
    expect(queryByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).toHaveClass('euiCallOut--warning');
    expect(getByText('Attach to timeline')).toBeInTheDocument();
    expect(
      getByText('Before attaching a note to the timeline, you need to save the timeline first.')
    ).toBeInTheDocument();
  });

  it('should render the saved timeline texts in the callout', () => {
    const mockStore = createMockStore({
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          ...mockGlobalState.timeline.timelineById,
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById[TimelineId.test],
            savedObjectId: 'savedObjectId',
          },
        },
      },
    });

    const { getByTestId, getByText, queryByTestId } = render(
      <TestProviders store={mockStore}>
        <AttachToActiveTimeline
          setAttachToTimeline={mockSetAttachToTimeline}
          isCheckboxDisabled={false}
        />
      </TestProviders>
    );

    expect(queryByTestId(SAVE_TIMELINE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).toHaveClass('euiCallOut--primary');
    expect(getByText('Attach to timeline')).toBeInTheDocument();
    expect(
      getByText('You can associate the newly created note to the active timeline.')
    ).toBeInTheDocument();
  });

  it('should call the callback when user click on the checkbox', () => {
    const mockStore = createMockStore({
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          ...mockGlobalState.timeline.timelineById,
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById[TimelineId.test],
            savedObjectId: 'savedObjectId',
          },
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={mockStore}>
        <AttachToActiveTimeline
          setAttachToTimeline={mockSetAttachToTimeline}
          isCheckboxDisabled={false}
        />
      </TestProviders>
    );

    const checkbox = getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID);

    checkbox.click();

    expect(mockSetAttachToTimeline).toHaveBeenCalledWith(false);

    checkbox.click();

    expect(mockSetAttachToTimeline).toHaveBeenCalledWith(true);
  });
});
