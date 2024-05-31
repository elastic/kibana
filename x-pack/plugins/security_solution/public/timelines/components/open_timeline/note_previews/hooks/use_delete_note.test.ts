/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { appActions } from '../../../../../common/store/app';
import { timelineActions } from '../../../../store';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { mockTimelineResults } from '../../../../../common/mock/timeline_results';
import { TestProviders } from '../../../../../common/mock';
import { useDeleteNote } from './use_delete_note';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useMutation: jest.fn((...args) => originalModule.useMutation(...args)),
  };
});

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_selector');

jest.mock('../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(),
}));

describe('useDeleteNote', () => {
  const mockHttp = {
    fetch: jest.fn(),
  };

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: mockHttp,
      },
    });
    const timeline = {
      ...mockTimelineResults[0],
      confirmingNoteId: 'noteId1',
    };
    (useDeepEqualSelector as jest.Mock).mockReturnValue(timeline);
    (useAppToasts as jest.Mock).mockReturnValue({
      addError: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the API to delete a note', async () => {
    const noteId = '123';
    const { result } = renderHook(() => useDeleteNote(noteId, null), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate(noteId);
    });

    expect(mockHttp.fetch).toHaveBeenCalledWith('/api/note', {
      method: 'DELETE',
      body: JSON.stringify({ noteId }),
      version: '2023-10-31',
    });
  });

  it('should dispatch appActions.deleteNote on success if savedObjectId is provided', async () => {
    const noteId = '123';
    const savedObjectId = 'abc';

    const { result } = renderHook(() => useDeleteNote(noteId, null, undefined, savedObjectId), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate(noteId);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      appActions.deleteNote({
        id: savedObjectId,
      })
    );
  });

  it('should dispatch timelineActions.deleteNoteFromEvent on success if noteId and eventId are provided', async () => {
    const noteId = '123';
    const eventId = 'xyz';

    const { result } = renderHook(() => useDeleteNote(noteId, eventId), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate(noteId);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      timelineActions.deleteNoteFromEvent({
        id: TimelineId.active,
        noteId,
        eventId,
      })
    );
  });

  it('should dispatch timelineActions.unPinEvent on success if eventId is provided and notes length is 1', async () => {
    const noteId = '123';
    const eventId = 'xyz';
    const eventIdToNoteIds = {
      [eventId]: ['123'],
    };

    const { result } = renderHook(() => useDeleteNote(noteId, eventId, eventIdToNoteIds), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate(noteId);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      timelineActions.unPinEvent({
        eventId,
        id: TimelineId.active,
      })
    );
  });

  it('should call addError on error', async () => {
    const noteId = '123';
    const errorMessage = 'Failed to delete note';
    mockHttp.fetch.mockRejectedValueOnce(new Error(errorMessage));
    const addError = jest.fn();
    (useAppToasts as jest.Mock).mockReturnValue({
      addError,
    });

    const { result } = renderHook(() => useDeleteNote(noteId, null), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate(noteId);
    });

    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title: expect.any(String),
    });
  });
});
