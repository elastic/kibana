/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, getOr, omit } from 'lodash/fp';
import { Dispatch } from 'redux';
import ApolloClient from 'apollo-client';

import {
  mockTimelineResults,
  mockTimelineResult,
  mockTimelineModel,
} from '../../../common/mock/timeline_results';
import { timelineDefaults } from '../../store/timeline/defaults';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../../common/store/inputs/actions';
import {
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
  addTimeline as dispatchAddTimeline,
  addNote as dispatchAddGlobalTimelineNote,
} from '../../store/timeline/actions';
import {
  addNotes as dispatchAddNotes,
  updateNote as dispatchUpdateNote,
} from '../../../common/store/app/actions';
import {
  defaultTimelineToTimelineModel,
  getNotesCount,
  getPinnedEventCount,
  isUntitled,
  omitTypenameInTimeline,
  dispatchUpdateTimeline,
  queryTimelineById,
  QueryTimelineById,
  formatTimelineResultToModel,
} from './helpers';
import { OpenTimelineResult, DispatchUpdateTimeline } from './types';
import { KueryFilterQueryKind } from '../../../common/store/model';
import { Note } from '../../../common/lib/note';
import moment from 'moment';
import sinon from 'sinon';
import {
  TimelineId,
  TimelineType,
  TimelineStatus,
  TimelineTabs,
} from '../../../../common/types/timeline';
import {
  mockTimeline as mockSelectedTimeline,
  mockTemplate as mockSelectedTemplate,
} from './__mocks__';

jest.mock('../../../common/store/inputs/actions');
jest.mock('../../../common/components/url_state/normalize_time_range.ts');
jest.mock('../../store/timeline/actions');
jest.mock('../../../common/store/app/actions');
jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

jest.mock('../../../common/utils/default_date_settings', () => {
  const actual = jest.requireActual('../../../common/utils/default_date_settings');
  return {
    ...actual,
    DEFAULT_FROM_MOMENT: new Date('2020-10-27T11:37:31.655Z'),
    DEFAULT_TO_MOMENT: new Date('2020-10-28T11:37:31.655Z'),
  };
});

describe('helpers', () => {
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  describe('#getPinnedEventCount', () => {
    test('returns 6 when the timeline has 6 pinned events', () => {
      const with6Events = mockResults[0];

      expect(getPinnedEventCount(with6Events)).toEqual(6);
    });

    test('returns zero when the timeline has an empty collection of pinned events', () => {
      const withPinnedEvents = { ...mockResults[0], pinnedEventIds: {} };

      expect(getPinnedEventCount(withPinnedEvents)).toEqual(0);
    });

    test('returns zero when pinnedEventIds is undefined', () => {
      const withPinnedEvents = omit('pinnedEventIds', { ...mockResults[0] });

      expect(getPinnedEventCount(withPinnedEvents)).toEqual(0);
    });

    test('returns zero when pinnedEventIds is null', () => {
      const withPinnedEvents = omit('pinnedEventIds', { ...mockResults[0] });

      expect(getPinnedEventCount(withPinnedEvents)).toEqual(0);
    });
  });

  describe('#getNotesCount', () => {
    test('returns a total of 4 notes when the timeline has 4 notes (event1 [2] + event2 [1] + global [1])', () => {
      const with4Notes = mockResults[0];

      expect(getNotesCount(with4Notes)).toEqual(4);
    });

    test('returns 1 note (global [1]) when eventIdToNoteIds is undefined', () => {
      const with1Note = omit('eventIdToNoteIds', { ...mockResults[0] });

      expect(getNotesCount(with1Note)).toEqual(1);
    });

    test('returns 1 note (global [1]) when eventIdToNoteIds is null', () => {
      const eventIdToNoteIdsIsNull = {
        ...mockResults[0],
        eventIdToNoteIds: null,
      };
      expect(getNotesCount(eventIdToNoteIdsIsNull)).toEqual(1);
    });

    test('returns 1 note (global [1]) when eventIdToNoteIds is empty', () => {
      const eventIdToNoteIdsIsEmpty = {
        ...mockResults[0],
        eventIdToNoteIds: {},
      };
      expect(getNotesCount(eventIdToNoteIdsIsEmpty)).toEqual(1);
    });

    test('returns 3 notes (event1 [2] + event2 [1]) when noteIds is undefined', () => {
      const noteIdsIsUndefined = omit('noteIds', { ...mockResults[0] });

      expect(getNotesCount(noteIdsIsUndefined)).toEqual(3);
    });

    test('returns 3 notes (event1 [2] + event2 [1]) when noteIds is null', () => {
      const noteIdsIsNull = {
        ...mockResults[0],
        noteIds: null,
      };

      expect(getNotesCount(noteIdsIsNull)).toEqual(3);
    });

    test('returns 3 notes (event1 [2] + event2 [1]) when noteIds is empty', () => {
      const noteIdsIsEmpty = {
        ...mockResults[0],
        noteIds: [],
      };

      expect(getNotesCount(noteIdsIsEmpty)).toEqual(3);
    });

    test('returns 0 when eventIdToNoteIds and noteIds are undefined', () => {
      const eventIdToNoteIdsAndNoteIdsUndefined = omit(['eventIdToNoteIds', 'noteIds'], {
        ...mockResults[0],
      });

      expect(getNotesCount(eventIdToNoteIdsAndNoteIdsUndefined)).toEqual(0);
    });

    test('returns 0 when eventIdToNoteIds and noteIds are null', () => {
      const eventIdToNoteIdsAndNoteIdsNull = {
        ...mockResults[0],
        eventIdToNoteIds: null,
        noteIds: null,
      };

      expect(getNotesCount(eventIdToNoteIdsAndNoteIdsNull)).toEqual(0);
    });

    test('returns 0 when eventIdToNoteIds and noteIds are empty', () => {
      const eventIdToNoteIdsAndNoteIdsEmpty = {
        ...mockResults[0],
        eventIdToNoteIds: {},
        noteIds: [],
      };

      expect(getNotesCount(eventIdToNoteIdsAndNoteIdsEmpty)).toEqual(0);
    });
  });

  describe('#isUntitled', () => {
    test('returns true when title is undefined', () => {
      const titleIsUndefined = omit('title', {
        ...mockResults[0],
      });

      expect(isUntitled(titleIsUndefined)).toEqual(true);
    });

    test('returns true when title is null', () => {
      const titleIsNull = {
        ...mockResults[0],
        title: null,
      };

      expect(isUntitled(titleIsNull)).toEqual(true);
    });

    test('returns true when title is just whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: '    ',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(true);
    });

    test('returns false when title is surrounded by whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: '  the king of the north  ',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(false);
    });

    test('returns false when title is NOT surrounded by whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: 'in the beginning...',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(false);
    });
  });

  describe('#defaultTimelineToTimelineModel', () => {
    test('if title is null, we should get the default title', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: null,
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });

    test('if duplicates and timeline.timelineType is not matching with outcome timelineType it should return draft with empty title', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatus.active,
        timelineType: TimelineType.default,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineType.template);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        title: '',
        timelineType: TimelineType.template,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });

    test('if duplicates and timeline.timelineType is not matching with outcome timelineType it should return draft with empty title template', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Template',
        version: '1',
        status: TimelineStatus.active,
        timelineType: TimelineType.template,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineType.default);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });

    test('if columns are null, we should get the default columns', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: null,
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        indexNames: [],
        id: 'savedObject-1',
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });

    test('should merge columns when event.action is deleted without two extra column names of user.name', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: timelineDefaults.columns.filter((column) => column.id !== 'event.action'),
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        savedObjectId: 'savedObject-1',
        columns: [
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: '@timestamp',
            placeholder: undefined,
            type: 'number',
            width: 190,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'message',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'event.category',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'host.name',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'source.ip',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'destination.ip',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
          {
            aggregatable: undefined,
            category: undefined,
            columnHeaderType: 'not-filtered',
            description: undefined,
            example: undefined,
            id: 'user.name',
            placeholder: undefined,
            type: undefined,
            width: 180,
          },
        ],
        version: '1',
        dataProviders: [],
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        id: 'savedObject-1',
      });
    });

    test('should merge filters object back with json object', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: timelineDefaults.columns.filter((column) => column.id !== 'event.action'),
        filters: [
          {
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: 'event.category',
              negate: false,
              params: '{"query":"file"}',
              type: 'phrase',
              value: null,
            },
            query: '{"match_phrase":{"event.category":"file"}}',
            exists: null,
          },
          {
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
            query: null,
            exists: '{"field":"@timestamp"}',
          },
        ],
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        savedObjectId: 'savedObject-1',
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        version: '1',
        dateRange: { start: '2020-07-07T08:20:18.966Z', end: '2020-07-08T08:20:18.966Z' },
        dataProviders: [],
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [
          {
            $state: {
              store: 'appState',
            },
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: 'event.category',
              negate: false,
              params: {
                query: 'file',
              },
              type: 'phrase',
              value: null,
            },
            query: {
              match_phrase: {
                'event.category': 'file',
              },
            },
          },
          {
            $state: {
              store: 'appState',
            },
            exists: {
              field: '@timestamp',
            },
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
          },
        ],
        highlightedDropAndProviderId: '',
        historyIds: [],
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        id: 'savedObject-1',
      });
    });

    test('should override timerange if given an Elastic prebuilt template', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatus.immutable,
        timelineType: TimelineType.template,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineType.template);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { end: '2020-10-28T11:37:31.655Z', start: '2020-10-27T11:37:31.655Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.immutable,
        title: 'Awesome Timeline',
        timelineType: TimelineType.template,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });

    test('should not override timerange if given a custom template or timeline', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatus.active,
        timelineType: TimelineType.default,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineType.default);
      expect(newTimeline).toEqual({
        activeTab: TimelineTabs.query,
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            type: 'number',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        expandedEvent: {},
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
        },
        loadingEventIds: [],
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.active,
        title: 'Awesome Timeline',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        version: '1',
      });
    });
  });

  describe('queryTimelineById', () => {
    describe('open a timeline', () => {
      const updateIsLoading = jest.fn();
      const selectedTimeline = {
        ...mockSelectedTimeline,
      };
      const apolloClient = {
        query: (jest.fn().mockResolvedValue(selectedTimeline) as unknown) as ApolloClient<{}>,
      };
      const onOpenTimeline = jest.fn();
      const args = {
        apolloClient,
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineType.default,
        onOpenTimeline,
        openTimeline: true,
        updateIsLoading,
        updateTimeline: jest.fn(),
      };

      beforeAll(async () => {
        await queryTimelineById<{}>((args as unknown) as QueryTimelineById<{}>);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('dispatch updateIsLoading to true', () => {
        expect(updateIsLoading.mock.calls[0][0]).toEqual({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('get timeline by Id', () => {
        expect(apolloClient.query).toHaveBeenCalled();
      });

      test('Do not override daterange if TimelineStatus is active', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.getOneTimeline', selectedTimeline)),
          args.duplicate,
          args.timelineType
        );
        expect(onOpenTimeline).toBeCalledWith({
          ...timeline,
        });
      });

      test('dispatch updateIsLoading to false', () => {
        expect(updateIsLoading.mock.calls[1][0]).toEqual({
          id: TimelineId.active,
          isLoading: false,
        });
      });
    });

    describe('update a timeline', () => {
      const updateIsLoading = jest.fn();
      const updateTimeline = jest.fn();
      const selectedTimeline = { ...mockSelectedTimeline };
      const apolloClient = {
        query: (jest.fn().mockResolvedValue(selectedTimeline) as unknown) as ApolloClient<{}>,
      };
      const args = {
        apolloClient,
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineType.default,
        openTimeline: true,
        updateIsLoading,
        updateTimeline,
      };

      beforeAll(async () => {
        await queryTimelineById<{}>((args as unknown) as QueryTimelineById<{}>);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('dispatch updateIsLoading to true', () => {
        expect(updateIsLoading.mock.calls[0][0]).toEqual({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('get timeline by Id', () => {
        expect(apolloClient.query).toHaveBeenCalled();
      });

      test('should not override daterange if TimelineStatus is active', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.getOneTimeline', selectedTimeline)),
          args.duplicate,
          args.timelineType
        );
        expect(updateTimeline).toBeCalledWith({
          timeline: {
            ...timeline,
            graphEventId: '',
            show: true,
            dateRange: {
              start: '2020-07-07T08:20:18.966Z',
              end: '2020-07-08T08:20:18.966Z',
            },
          },
          duplicate: false,
          from: '2020-07-07T08:20:18.966Z',
          to: '2020-07-08T08:20:18.966Z',
          notes: [],
          id: TimelineId.active,
        });
      });

      test('dispatch updateIsLoading to false', () => {
        expect(updateIsLoading.mock.calls[1][0]).toEqual({
          id: TimelineId.active,
          isLoading: false,
        });
      });
    });

    describe('open an immutable template', () => {
      const updateIsLoading = jest.fn();
      const template = { ...mockSelectedTemplate };
      const apolloClient = {
        query: (jest.fn().mockResolvedValue(template) as unknown) as ApolloClient<{}>,
      };
      const onOpenTimeline = jest.fn();
      const args = {
        apolloClient,
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineType.template,
        onOpenTimeline,
        openTimeline: true,
        updateIsLoading,
        updateTimeline: jest.fn(),
      };

      beforeAll(async () => {
        await queryTimelineById<{}>((args as unknown) as QueryTimelineById<{}>);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('dispatch updateIsLoading to true', () => {
        expect(updateIsLoading.mock.calls[0][0]).toEqual({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('get timeline by Id', () => {
        expect(apolloClient.query).toHaveBeenCalled();
      });

      test('override daterange if TimelineStatus is immutable', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.getOneTimeline', template)),
          args.duplicate,
          args.timelineType
        );
        expect(onOpenTimeline).toBeCalledWith({
          ...timeline,
          dateRange: {
            end: '2020-10-28T11:37:31.655Z',
            start: '2020-10-27T11:37:31.655Z',
          },
        });
      });

      test('dispatch updateIsLoading to false', () => {
        expect(updateIsLoading.mock.calls[1][0]).toEqual({
          id: TimelineId.active,
          isLoading: false,
        });
      });
    });
  });

  describe('omitTypenameInTimeline', () => {
    test('it does not modify the passed in timeline if no __typename exists', () => {
      const result = omitTypenameInTimeline(mockTimelineResult);

      expect(result).toEqual(mockTimelineResult);
    });

    test('it returns timeline with __typename removed when it exists', () => {
      const mockTimeline = {
        ...mockTimelineResult,
        __typename: 'something, something',
      };
      const result = omitTypenameInTimeline(mockTimeline);
      const expectedTimeline = {
        ...mockTimeline,
        __typename: undefined,
      };

      expect(result).toEqual(expectedTimeline);
    });
  });

  describe('dispatchUpdateTimeline', () => {
    const dispatch = jest.fn() as Dispatch;
    const anchor = '2020-03-27T20:34:51.337Z';
    const unix = moment(anchor).valueOf();
    let clock: sinon.SinonFakeTimers;
    let timelineDispatch: DispatchUpdateTimeline;

    beforeEach(() => {
      jest.clearAllMocks();

      clock = sinon.useFakeTimers(unix);
      timelineDispatch = dispatchUpdateTimeline(dispatch);
    });

    afterEach(function () {
      clock.restore();
    });

    test('it invokes date range picker dispatch', () => {
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimelineModel,
      })();

      expect(dispatchSetTimelineRangeDatePicker).toHaveBeenCalledWith({
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
      });
    });

    test('it invokes add timeline dispatch', () => {
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimelineModel,
      })();

      expect(dispatchAddTimeline).toHaveBeenCalledWith({
        id: TimelineId.active,
        savedTimeline: true,
        timeline: mockTimelineModel,
      });
    });

    test('it does not invoke kql filter query dispatches if timeline.kqlQuery.filterQuery is null', () => {
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimelineModel,
      })();

      expect(dispatchApplyKqlFilterQuery).not.toHaveBeenCalled();
    });

    test('it does not invoke notes dispatch if duplicate is true', () => {
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimelineModel,
      })();

      expect(dispatchAddNotes).not.toHaveBeenCalled();
    });

    test('it does not invoke kql filter query dispatches if timeline.kqlQuery.kuery is null', () => {
      const mockTimeline = {
        ...mockTimelineModel,
        kqlQuery: {
          filterQuery: {
            kuery: null,
            serializedQuery: 'some-serialized-query',
          },
        },
      };
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimeline,
      })();

      expect(dispatchApplyKqlFilterQuery).not.toHaveBeenCalled();
    });

    test('it invokes kql filter query dispatches if timeline.kqlQuery.filterQuery.kuery is not null', () => {
      const mockTimeline = {
        ...mockTimelineModel,
        kqlQuery: {
          filterQuery: {
            kuery: { expression: 'expression', kind: 'kuery' as KueryFilterQueryKind },
            serializedQuery: 'some-serialized-query',
          },
        },
      };
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimeline,
      })();

      expect(dispatchApplyKqlFilterQuery).toHaveBeenCalledWith({
        id: TimelineId.active,
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression: 'expression',
          },
          serializedQuery: 'some-serialized-query',
        },
      });
    });

    test('it invokes dispatchAddNotes if duplicate is false', () => {
      timelineDispatch({
        duplicate: false,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [
          {
            created: 1585233356356,
            updated: 1585233356356,
            noteId: 'note-id',
            note: 'I am a note',
          },
        ],
        timeline: mockTimelineModel,
      })();

      expect(dispatchAddGlobalTimelineNote).not.toHaveBeenCalled();
      expect(dispatchUpdateNote).not.toHaveBeenCalled();
      expect(dispatchAddNotes).toHaveBeenCalledWith({
        notes: [
          {
            created: new Date('2020-03-26T14:35:56.356Z'),
            eventId: null,
            id: 'note-id',
            lastEdit: new Date('2020-03-26T14:35:56.356Z'),
            note: 'I am a note',
            user: 'unknown',
            saveObjectId: 'note-id',
            timelineId: null,
            version: undefined,
          },
        ],
      });
    });

    test('it invokes dispatch to create a timeline note if duplicate is true and ruleNote exists', () => {
      timelineDispatch({
        duplicate: true,
        id: TimelineId.active,
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
        notes: [],
        timeline: mockTimelineModel,
        ruleNote: '# this would be some markdown',
      })();
      const expectedNote: Note = {
        created: new Date(anchor),
        id: 'uuid.v4()',
        lastEdit: null,
        note: '# this would be some markdown',
        saveObjectId: null,
        user: 'elastic',
        version: null,
      };

      expect(dispatchAddNotes).not.toHaveBeenCalled();
      expect(dispatchUpdateNote).toHaveBeenCalledWith({ note: expectedNote });
      expect(dispatchAddGlobalTimelineNote).toHaveBeenLastCalledWith({
        id: TimelineId.active,
        noteId: 'uuid.v4()',
      });
    });
  });
});
