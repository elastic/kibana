/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock, mockGlobalState } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { TimelineId } from '../../../../common/types/timeline';
import { persistPinnedEvent } from '../../containers/pinned_event/api';
import { refreshTimelines } from './helpers';
import { TimelineStatus } from '../../../../common/api/timeline';
import { UNTITLED_TIMELINE } from '../../components/open_timeline/translations';
import {
  startTimelineSaving,
  endTimelineSaving,
  pinEvent,
  unPinEvent,
  showCallOutUnauthorizedMsg,
  updateTimeline,
  saveTimeline,
} from '../actions';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  const endTLSaving = jest.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
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
jest.mock('../../containers/pinned_event/api');
jest.mock('./helpers');

const startTimelineSavingMock = startTimelineSaving as unknown as jest.Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as jest.Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as jest.Mock;
const updateTimelineMock = updateTimeline as unknown as jest.Mock;
const saveTimelineMock = saveTimeline as unknown as jest.Mock;

describe('Timeline pinned event middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const testEventId = 'test';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    jest.clearAllMocks();
  });

  it('should persist a timeline pin event action', async () => {
    (persistPinnedEvent as jest.Mock).mockResolvedValue({
      data: {
        persistPinnedEventOnTimeline: {
          code: 200,
        },
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({
      [testEventId]: true,
    });
  });

  it('should persist a timeline un-pin event', async () => {
    store = createMockStore(
      {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
            ...mockGlobalState.timeline.timelineById,
            [TimelineId.test]: {
              ...mockGlobalState.timeline.timelineById[TimelineId.test],
              pinnedEventIds: {
                [testEventId]: true,
              },
            },
          },
        },
      },
      undefined,
      kibanaMock
    );

    (persistPinnedEvent as jest.Mock).mockResolvedValue({
      data: {},
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({
      [testEventId]: true,
    });
    await store.dispatch(unPinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
  });

  it('should persist the timeline when a pinned event was created on an unsaved timeline', async () => {
    const testTimelineId = 'testTimelineId';
    const testTimelineVersion = 'testVersion';
    (persistPinnedEvent as jest.Mock).mockResolvedValue({
      data: {
        persistPinnedEventOnTimeline: {
          code: 200,
          timelineId: testTimelineId,
          timelineVersion: testTimelineVersion,
        },
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(persistPinnedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        timelineId: null,
        eventId: testEventId,
        pinnedEventId: null,
      })
    );

    expect(updateTimelineMock).toHaveBeenNthCalledWith(
      2,
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

  it('should show an error message when the call is unauthorized', async () => {
    (persistPinnedEvent as jest.Mock).mockResolvedValue({
      data: {
        persistPinnedEventOnTimeline: {
          code: 403,
        },
      },
    });

    await store.dispatch(unPinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistPinnedEvent as jest.Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
