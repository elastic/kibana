/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as module from './create_timelines';
import { persistTimeline } from '../../saved_object';
import { persistPinnedEventOnTimeline } from '../../../pinned_event/saved_object';
import { persistNote, getNote } from '../../../note/saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline } from '../../../../../common/types/timeline';
import { mockTemplate, mockTimeline } from '../__mocks__/create_timelines';

const frameworkRequest = {} as FrameworkRequest;
const template = { ...mockTemplate } as SavedTimeline;
const timeline = { ...mockTimeline } as SavedTimeline;
const timelineSavedObjectId = null;
const timelineVersion = null;
const pinnedEventIds = ['123'];
const notes = [
  { noteId: 'abc', note: 'new note', timelineId: '', created: 1603885051655, createdBy: 'elastic' },
];
const existingNoteIds = undefined;
const isImmutable = true;
const newTimelineSavedObjectId = 'eb2781c0-1df5-11eb-8589-2f13958b79f7';

jest.mock('moment', () => {
  const mockMoment = {
    toISOString: jest
      .fn()
      .mockReturnValueOnce('2020-11-03T11:37:31.655Z')
      .mockReturnValue('2020-11-04T11:37:31.655Z'),
    subtract: jest.fn(),
  };
  mockMoment.subtract.mockReturnValue(mockMoment);
  return jest.fn().mockReturnValue(mockMoment);
});

jest.mock('../../saved_object', () => ({
  persistTimeline: jest.fn().mockResolvedValue({
    timeline: {
      savedObjectId: 'eb2781c0-1df5-11eb-8589-2f13958b79f7',
      version: 'xJs23==',
    },
  }),
}));

jest.mock('../../../pinned_event/saved_object', () => ({
  persistPinnedEventOnTimeline: jest.fn(),
}));

jest.mock('../../../note/saved_object', () => ({
  getNote: jest.fn(),
  persistNote: jest.fn(),
}));

describe('createTimelines', () => {
  describe('create timelines', () => {
    beforeAll(async () => {
      await module.createTimelines({
        frameworkRequest,
        timeline,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('respect input timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-11-03T13:34:40.339Z'
      );
    });

    test('respect input timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-11-04T13:34:40.339Z'
      );
    });

    test('savePinnedEvents', () => {
      expect((persistPinnedEventOnTimeline as jest.Mock).mock.calls[0][2]).toEqual('123');
    });

    test('saveNotes', () => {
      expect((persistNote as jest.Mock).mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: 'new note',
        timelineId: newTimelineSavedObjectId,
      });
    });
  });

  describe('create immutable templates', () => {
    beforeAll(async () => {
      (getNote as jest.Mock).mockReturnValue({
        ...notes[0],
      });
      await module.createTimelines({
        frameworkRequest,
        timeline: template,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable,
        overrideNotesOwner: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    test('override timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-11-03T11:37:31.655Z'
      );
    });

    test('override timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-11-04T11:37:31.655Z'
      );
    });
  });

  describe('create custom templates', () => {
    beforeAll(async () => {
      await module.createTimelines({
        frameworkRequest,
        timeline: template,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('respect input timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-10-01T11:37:31.655Z'
      );
    });

    test('respect input timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-10-02T11:37:31.655Z'
      );
    });
  });
});
