/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
  NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from './test_ids';
import { FETCH_NOTES_ERROR, Notes } from './notes';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { ReqStatus } from '../../../../notes';
import type { Note } from '../../../../../common/api/timeline';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelNotesTab } from '../../left';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../common/components/user_privileges');

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

describe('<Notes />', () => {
  beforeEach(() => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    jest.clearAllMocks();
  });

  it('should render loading spinner', () => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: jest.fn() });

    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toHaveTextContent('Notes');
    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render Add note button if no notes are present', () => {
    const mockOpenLeftPanel = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    const button = getByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    button.click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelNotesTab },
      params: {
        id: mockContextValue.eventId,
        indexName: mockContextValue.indexName,
        scopeId: mockContextValue.scopeId,
      },
    });
  });

  it('should disabled the Add note button if in preview mode', () => {
    const contextValue = {
      ...mockContextValue,
      isPreviewMode: true,
    };

    const mockOpenLeftPanel = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    const button = getByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();

    button.click();

    expect(mockOpenLeftPanel).not.toHaveBeenCalled();
  });

  it('should render number of notes and plus button', () => {
    const mockOpenLeftPanel = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });

    const contextValue = {
      ...mockContextValue,
      eventId: '1',
    };

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(NOTES_COUNT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');

    const button = getByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID);

    expect(button).toBeInTheDocument();
    button.click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelNotesTab },
      params: {
        id: contextValue.eventId,
        indexName: mockContextValue.indexName,
        scopeId: mockContextValue.scopeId,
      },
    });
  });

  it('should disable the plus button if in preview mode', () => {
    const mockOpenLeftPanel = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });

    const contextValue = {
      ...mockContextValue,
      eventId: '1',
      isPreviewMode: true,
    };

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(NOTES_COUNT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');

    expect(mockDispatch).not.toHaveBeenCalled();

    const button = getByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID);

    expect(button).toBeInTheDocument();
    button.click();
    expect(button).toBeDisabled();

    expect(mockOpenLeftPanel).not.toHaveBeenCalled();
  });

  it('should render number of notes in scientific notation for big numbers', () => {
    const createMockNote = (noteId: string): Note => ({
      eventId: '1', // should be a valid id based on mockTimelineData
      noteId,
      note: 'note-1',
      timelineId: 'timeline-1',
      created: 1663882629000,
      createdBy: 'elastic',
      updated: 1663882629000,
      updatedBy: 'elastic',
      version: 'version',
    });
    const mockEntities = [...Array(1000).keys()]
      .map((i: number) => createMockNote(i.toString()))
      .reduce((acc, entity) => {
        // @ts-ignore
        acc[entity.noteId] = entity;
        return acc;
      }, {});
    const mockIds = Object.keys(mockEntities);

    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: mockEntities,
        ids: mockIds,
      },
    });
    const contextValue = {
      ...mockContextValue,
      eventId: '1',
    };

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1k');
  });

  it('should show a - when in rule creation workflow', () => {
    const contextValue = {
      ...mockContextValue,
      isPreview: true,
    };

    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: jest.fn() });

    const { getByText, queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    expect(queryByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_COUNT_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });

  it('should render toast error', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          fetchNotesByDocumentIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should show View note button if user does not have the correct privileges but notes have already been created', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });

    const mockOpenLeftPanel = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });

    const contextValue = {
      ...mockContextValue,
      eventId: '1',
    };

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();

    expect(getByTestId(NOTES_COUNT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');

    expect(queryByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    const button = getByTestId(NOTES_VIEW_NOTES_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    button.click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelNotesTab },
      params: {
        id: contextValue.eventId,
        indexName: mockContextValue.indexName,
        scopeId: mockContextValue.scopeId,
      },
    });
  });

  it('should show a - if user does not have the correct privileges and no notes have been created', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });

    const { getByText, queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <Notes />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();

    expect(queryByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_COUNT_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });
});
