/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { TimelineId } from '../../../../common/types/timeline';
import { persistNote } from '../../containers/notes/api';
import { refreshTimelines } from './helpers';

import {
  startTimelineSaving,
  endTimelineSaving,
  showCallOutUnauthorizedMsg,
  addNote,
  addNoteToEvent,
  updateTimeline,
  saveTimeline,
  pinEvent,
} from '../actions';
import { updateNote } from '../../../common/store/app/actions';
import { createNote } from '../../components/notes/helpers';
import { TimelineStatus } from '../../../../common/api/timeline';
import { UNTITLED_TIMELINE } from '../../components/open_timeline/translations';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  const endTLSaving = jest.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
    pinEvent: jest.fn((...args) => actual.pinEvent(...args)),
    updateTimeline: jest.fn().mockImplementation((...args) => actual.updateTimeline(...args)),
    saveTimeline: jest.fn().mockImplementation((...args) => actual.saveTimeline(...args)),
    showCallOutUnauthorizedMsg: jest
      .fn()
      .mockImplementation((...args) => actual.showCallOutUnauthorizedMsg(...args)),
    startTimelineSaving: jest
      .fn()
      .mockImplementation((...args) => actual.startTimelineSaving(...args)),
    endTimelineSaving: endTLSaving,
  };
});
jest.mock('../../containers/notes/api');
jest.mock('./helpers');

const startTimelineSavingMock = startTimelineSaving as unknown as jest.Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as jest.Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as jest.Mock;
const updateTimelineMock = updateTimeline as unknown as jest.Mock;
const saveTimelineMock = saveTimeline as unknown as jest.Mock;
const pinEventMock = pinEvent as unknown as jest.Mock;

describe('Timeline note middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const testNote = createNote({ newNote: 'test', user: 'elastic' });
  const testEventId = 'test';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    jest.clearAllMocks();
  });

  it('should persist a timeline note', async () => {
    (persistNote as jest.Mock).mockResolvedValue({
      data: {
        persistNote: {
          code: 200,
          message: 'success',
          note: {
            noteId: testNote.id,
          },
        },
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).noteIds).toEqual([]);
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).noteIds).toContain(testNote.id);
  });

  it('should persist a note on an event of a timeline', async () => {
    (persistNote as jest.Mock).mockResolvedValue({
      data: {
        persistNote: {
          code: 200,
          message: 'success',
          note: {
            noteId: testNote.id,
          },
        },
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).eventIdToNoteIds).toEqual({});
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({ eventId: testEventId, id: TimelineId.test, noteId: testNote.id })
    );

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).eventIdToNoteIds).toEqual(
      expect.objectContaining({
        [testEventId]: [testNote.id],
      })
    );
  });

  it('should persist the timeline when a note was created on an unsaved timeline', async () => {
    const testTimelineId = 'testTimelineId';
    const testTimelineVersion = 'testVersion';
    (persistNote as jest.Mock).mockResolvedValue({
      data: {
        persistNote: {
          code: 200,
          message: 'success',
          note: {
            noteId: testNote.id,
            timelineId: testTimelineId,
            timelineVersion: testTimelineVersion,
          },
        },
      },
    });

    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        savedObjectId: null,
        version: null,
      })
    );
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({ eventId: testEventId, id: TimelineId.test, noteId: testNote.id })
    );

    expect(updateTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        timeline: expect.objectContaining({
          savedObjectId: testTimelineId,
          version: testTimelineVersion,
          status: TimelineStatus.active,
          title: UNTITLED_TIMELINE,
        }),
      })
    );
    expect(saveTimelineMock).toHaveBeenCalled();
  });

  it('should pin the event when the `pinEvent` flag is passed', async () => {
    const testTimelineId = 'testTimelineId';
    const testTimelineVersion = 'testVersion';
    (persistNote as jest.Mock).mockResolvedValue({
      data: {
        persistNote: {
          code: 200,
          message: 'success',
          note: {
            noteId: testNote.id,
            timelineId: testTimelineId,
            timelineVersion: testTimelineVersion,
          },
        },
      },
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({
        eventId: testEventId,
        id: TimelineId.test,
        noteId: testNote.id,
        pinEvent: true,
      })
    );

    expect(pinEventMock).toHaveBeenCalledWith({
      eventId: testEventId,
      id: TimelineId.test,
    });
  });

  it('should show an error message when the call is unauthorized', async () => {
    (persistNote as jest.Mock).mockResolvedValue({
      data: {
        persistNote: {
          code: 403,
        },
      },
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistNote as jest.Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
