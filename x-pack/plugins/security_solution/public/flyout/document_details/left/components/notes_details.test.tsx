/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { FETCH_NOTES_ERROR, NO_NOTES, NotesDetails } from './notes_details';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  ADD_NOTE_BUTTON_TEST_ID,
  NOTES_LOADING_TEST_ID,
} from '../../../../notes/components/test_ids';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
} from './test_ids';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { Flyouts } from '../../shared/constants/flyouts';
import { TimelineId } from '../../../../../common/types';
import { ReqStatus } from '../../../../notes';

jest.mock('../../shared/hooks/use_which_flyout');

jest.mock('../../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const mockAddError = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
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

const panelContextValue = {
  eventId: 'event id',
} as unknown as DocumentDetailsContext;
const mockGlobalStateWithSavedTimeline = {
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
};

const renderNotesDetails = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <NotesDetails />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('NotesDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.timeline);
  });

  it('should fetch notes for the document id', () => {
    const mockStore = createMockStore(mockGlobalStateWithSavedTimeline);

    render(
      <TestProviders store={mockStore}>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <NotesDetails />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should render loading spinner if notes are being fetched', () => {
    const store = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <NotesDetails />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message if no notes are present', () => {
    const store = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    });

    const { getByText } = render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <NotesDetails />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByText(NO_NOTES)).toBeInTheDocument();
  });

  it('should render error toast if fetching notes fails', () => {
    const store = createMockStore({
      ...mockGlobalStateWithSavedTimeline,
      notes: {
        ...mockGlobalStateWithSavedTimeline.notes,
        status: {
          ...mockGlobalStateWithSavedTimeline.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalStateWithSavedTimeline.notes.error,
          fetchNotesByDocumentIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <NotesDetails />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should not render the add note section for users without crud privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });

    const { queryByTestId } = renderNotesDetails();

    expect(queryByTestId(ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render the callout and attach to timeline checkbox if not timeline flyout', () => {
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.securitySolution);

    const { getByTestId, queryByTestId } = renderNotesDetails();

    expect(getByTestId(ADD_NOTE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).not.toBeInTheDocument();
  });
});
