/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import NotesTabContentComponent, { FETCH_NOTES_ERROR, NO_NOTES } from '.';
import { render } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../../common/mock';
import { ReqStatus } from '../../../../../notes';
import {
  NOTES_LOADING_TEST_ID,
  TIMELINE_DESCRIPTION_COMMENT_TEST_ID,
} from '../../../../../notes/components/test_ids';
import React from 'react';
import { TimelineId } from '../../../../../../common/types';
import { SAVE_TIMELINE_CALLOUT_TEST_ID } from '../../../notes/test_ids';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import type { State } from '../../../../../common/store';

jest.mock('../../../../../common/hooks/use_experimental_features');
jest.mock('../../../../../common/components/user_privileges');

const mockAddError = jest.fn();
jest.mock('../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const mockGlobalStateWithSavedTimeline: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: 'savedObjectId',
        status: TimelineStatusEnum.active,
      },
    },
  },
};
const mockGlobalStateWithUnSavedTimeline: State = {
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
};

describe('NotesTabContentComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
  });

  it('should show the old note system', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <NotesTabContentComponent timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(getByTestId('old-notes-screen')).toBeInTheDocument();
    expect(queryByTestId('new-notes-screen')).not.toBeInTheDocument();
  });

  it('should show the new note system', () => {
    const mockStore = createMockStore(mockGlobalStateWithSavedTimeline);

    const { getByTestId, queryByTestId } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(getByTestId('new-notes-screen')).toBeInTheDocument();
    expect(queryByTestId('old-notes-screen')).not.toBeInTheDocument();
  });

  it('should fetch notes for the saved object id if timeline has been saved and hide callout', () => {
    const mockStore = createMockStore(mockGlobalStateWithSavedTimeline);

    const { queryByTestId } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.active} />
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();
    expect(queryByTestId(SAVE_TIMELINE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not fetch notes if timeline is unsaved', () => {
    const mockStore = createMockStore(mockGlobalStateWithUnSavedTimeline);

    const { getByTestId } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(getByTestId(SAVE_TIMELINE_CALLOUT_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading spinner if notes are being fetched', () => {
    const mockStore = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message if no notes are present and timeline has been saved', () => {
    const mockStore = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Succeeded,
        },
      },
    });

    const { getByText } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.active} />
      </TestProviders>
    );

    expect(getByText(NO_NOTES)).toBeInTheDocument();
  });

  it('should render error toast if fetching notes fails', () => {
    const mockStore = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalStateWithSavedTimeline.notes.error,
          fetchNotesBySavedObjectIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should render the timeline description at the top', () => {
    const mockStore = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      timeline: {
        ...mockGlobalStateWithSavedTimeline.timeline,
        timelineById: {
          ...mockGlobalStateWithSavedTimeline.timeline.timelineById,
          [TimelineId.active]: {
            ...mockGlobalStateWithSavedTimeline.timeline.timelineById[TimelineId.active],
            description: 'description',
          },
        },
      },
    });

    const { getByTestId, getByText } = render(
      <TestProviders store={mockStore}>
        <NotesTabContentComponent timelineId={TimelineId.active} />
      </TestProviders>
    );

    expect(getByTestId(TIMELINE_DESCRIPTION_COMMENT_TEST_ID)).toBeInTheDocument();
    expect(getByText('description')).toBeInTheDocument();
  });
});
