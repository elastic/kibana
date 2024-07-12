/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimelineId, TimelineTabs } from '../../../../../common/types';
import { renderHook, act } from '@testing-library/react-hooks/dom';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import type { UseNotesInFlyoutArgs } from './use_notes_in_flyout';
import { useNotesInFlyout } from './use_notes_in_flyout';
import { waitFor } from '@testing-library/react';
import { useDispatch } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

const mockEventIdToNoteIds = {
  'event-1': ['note-1', 'note-3'],
  'event-2': ['note-2'],
};

const note1 = {
  created: new Date('2024-06-25T13:34:35.669Z'),
  id: 'note-1',
  lastEdit: new Date('2024-06-25T13:34:35.669Z'),
  note: 'First Comment',
  user: 'elastic',
  saveObjectId: '7402b6fc-34a8-42bd-b590-389df3011c6b',
  version: 'WzU0OTcsMV0=',
  eventId: 'event-1',
  timelineId: '35937e12-b600-4bdd-a79e-5431aa39ab4b',
};

const note2 = {
  created: new Date('2024-06-25T11:57:22.031Z'),
  id: 'note-2',
  lastEdit: new Date('2024-06-25T11:57:22.031Z'),
  note: 'Some Note',
  user: 'elastic',
  saveObjectId: 'fafdfe3e-82b6-4c09-b116-fcba4a5390de',
  version: 'WzU0OTUsMV0=',
  eventId: 'event-2',
  timelineId: '35937e12-b600-4bdd-a79e-5431aa39ab4b',
};

const note3 = {
  ...note1,
  id: 'note-3',
  eventId: 'event-1',
  note: 'Third Comment',
  saveObjectId: 'note-3',
};

const mockState = structuredClone(mockGlobalState);

const mockLocalState = {
  ...mockState,
  timeline: {
    ...mockState.timeline,
    timelineById: {
      [TimelineId.test]: {
        ...mockState.timeline.timelineById[TimelineId.test],
        eventIdToNoteIds: {
          ...mockEventIdToNoteIds,
        },
      },
    },
  },
  app: {
    ...mockState.app,
    notesById: {
      'note-1': note1,
      'note-2': note2,
      'note-3': note3,
    },
  },
};

const dispatchMock = jest.fn();
const refetchMock = jest.fn();

const renderTestHook = () => {
  return renderHook(
    (props?: Partial<UseNotesInFlyoutArgs>) =>
      useNotesInFlyout({
        eventIdToNoteIds: mockEventIdToNoteIds,
        timelineId: TimelineId.test,
        refetch: refetchMock,
        activeTab: TimelineTabs.query,
        ...props,
      }),
    {
      wrapper: ({ children }) => (
        <TestProviders store={createMockStore(mockLocalState)}>{children}</TestProviders>
      ),
    }
  );
};

describe('useNotesInFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
  });
  it('should return correct array of notes based on Events', async () => {
    const { result } = renderTestHook();

    expect(result.current.notes).toEqual([]);

    act(() => {
      result.current.setNotesEventId('event-1');
    });

    await waitFor(() => {
      expect(result.current.notes).toMatchObject(
        [note1, note3].map((note) => ({
          savedObjectId: note.saveObjectId,
          note: note.note,
          noteId: note.id,
          updated: (note.lastEdit ?? note.created).getTime(),
          updatedBy: note.user,
        }))
      );
    });

    act(() => {
      result.current.setNotesEventId('event-2');
    });

    await waitFor(() => {
      expect(result.current.notes).toMatchObject(
        [note2].map((note) => ({
          savedObjectId: note.saveObjectId,
          note: note.note,
          noteId: note.id,
          updated: (note.lastEdit ?? note.created).getTime(),
          updatedBy: note.user,
        }))
      );
    });
  });

  it('should show flyout when eventId is not undefined', async () => {
    const { result } = renderTestHook();

    expect(result.current.eventId).toBeUndefined();
    expect(result.current.notes).toEqual([]);

    act(() => {
      result.current.setNotesEventId('event-1');
    });

    await waitFor(() => {
      expect(result.current.eventId).toBe('event-1');
    });

    act(() => {
      result.current.showNotesFlyout();
    });

    expect(result.current.isNotesFlyoutVisible).toBe(true);
  });

  it('should return correct instance of associate Note', () => {
    const { result } = renderTestHook();

    act(() => {
      result.current.setNotesEventId('event-1');
    });

    const { associateNote } = result.current;

    dispatchMock.mockClear();
    associateNote('some-noteId');

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('should close flyout correctly', () => {
    const { result } = renderTestHook();

    act(() => {
      result.current.setNotesEventId('event-1');
    });

    act(() => {
      result.current.showNotesFlyout();
    });

    expect(result.current.isNotesFlyoutVisible).toBe(true);

    act(() => {
      result.current.closeNotesFlyout();
    });

    expect(result.current.isNotesFlyoutVisible).toBe(false);
  });

  it('should close the flyout when activeTab is changed', () => {
    const { result, rerender, waitForNextUpdate } = renderTestHook();

    act(() => {
      result.current.setNotesEventId('event-1');
    });

    act(() => {
      result.current.showNotesFlyout();
    });

    expect(result.current.isNotesFlyoutVisible).toBe(true);

    act(() => {
      // no change in active Tab
      rerender({ activeTab: TimelineTabs.query });
    });

    expect(result.current.isNotesFlyoutVisible).toBe(true);

    act(() => {
      rerender({ activeTab: TimelineTabs.eql });
    });

    waitForNextUpdate();

    expect(result.current.isNotesFlyoutVisible).toBe(false);
  });
});
