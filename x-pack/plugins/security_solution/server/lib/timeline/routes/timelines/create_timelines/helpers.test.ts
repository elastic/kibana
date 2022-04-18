/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as module from './helpers';
import { savePinnedEvents } from '../../../saved_object/pinned_events';
import { getNote } from '../../../saved_object/notes';
import { FrameworkRequest } from '../../../../framework';
import { SavedTimeline } from '../../../../../../common/types';
import { mockTemplate, mockTimeline } from '../../../__mocks__/create_timelines';
import { buildFrameworkRequest } from '../../../utils/common';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { requestContextMock } from '../../../../detection_engine/routes/__mocks__';
import {
  getCreateTimelinesRequest,
  createTimelineWithoutTimelineId,
} from '../../../__mocks__/request_responses';
import { persistTimeline } from '../../../saved_object/timelines';
import { persistNotes } from '../../../saved_object/notes/persist_notes';

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

jest.mock('../../../saved_object/timelines', () => ({
  persistTimeline: jest.fn().mockResolvedValue({
    timeline: {
      savedObjectId: 'eb2781c0-1df5-11eb-8589-2f13958b79f7',
      version: 'xJs23==',
    },
  }),
}));

jest.mock('../../../saved_object/pinned_events', () => ({
  savePinnedEvents: jest.fn(),
}));

jest.mock('../../../saved_object/notes', () => ({
  getNote: jest.fn(),
  persistNote: jest.fn(),
}));

jest.mock('../../../saved_object/notes/persist_notes', () => ({
  persistNotes: jest.fn(),
}));

describe('createTimelines', () => {
  let securitySetup: SecurityPluginSetup;
  let frameworkRequest: FrameworkRequest;

  beforeAll(async () => {
    securitySetup = {
      authc: {
        getCurrentUser: jest.fn(),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    const { context } = requestContextMock.createTools();
    const mockRequest = getCreateTimelinesRequest(createTimelineWithoutTimelineId);

    frameworkRequest = await buildFrameworkRequest(context, securitySetup, mockRequest);
    Date.now = jest.fn().mockReturnValue(new Date('2020-11-04T11:37:31.655Z'));
  });

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
      expect((savePinnedEvents as jest.Mock).mock.calls[0][2]).toEqual(['123']);
    });

    test('persistNotes', () => {
      expect((persistNotes as jest.Mock).mock.calls[0][3]).toEqual([
        {
          created: 1603885051655,
          createdBy: 'elastic',
          note: 'new note',
          noteId: 'abc',
          timelineId: '',
        },
      ]);
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
