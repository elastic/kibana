/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { NOTES_COUNT_TEST_ID, NOTES_LOADING_TEST_ID, NOTES_TITLE_TEST_ID } from './test_ids';
import { FETCH_NOTES_ERROR, Notes } from './notes';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { ReqStatus } from '../../../../notes';
import type { Note } from '../../../../../common/api/timeline';

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
  it('should render loading spinner', () => {
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

  it('should render number of notes', () => {
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

    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toHaveTextContent('Notes');
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');
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
});
