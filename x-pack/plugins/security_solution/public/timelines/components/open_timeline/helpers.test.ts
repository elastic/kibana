/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, getOr, omit } from 'lodash/fp';
import { Dispatch } from 'redux';

import {
  mockTimelineResults,
  mockTimelineModel,
  mockGetOneTimelineResult,
} from '../../../common/mock';
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
import { Note } from '../../../common/lib/note';
import moment from 'moment';
import sinon from 'sinon';
import {
  TimelineId,
  TimelineType,
  TimelineStatus,
  KueryFilterQueryKind,
} from '../../../../common/types/timeline';
import {
  mockTimeline as mockSelectedTimeline,
  mockTemplate as mockSelectedTemplate,
} from './__mocks__';
import { resolveTimeline } from '../../containers/api';

jest.mock('../../../common/store/inputs/actions');
jest.mock('../../../common/components/url_state/normalize_time_range');
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

jest.mock('../../containers/api');

const columns = [
  {
    columnHeaderType: 'not-filtered',
    id: '@timestamp',
    type: 'number',
    initialWidth: 190,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'message',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.category',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.action',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'host.name',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'source.ip',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'destination.ip',
    initialWidth: 180,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'user.name',
    initialWidth: 180,
  },
];
const defaultTimeline = {
  ...timelineDefaults,
  columns,
  version: '1',
  savedObjectId: 'savedObject-1',
  id: 'savedObject-1',
};

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
        ...defaultTimeline,
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
        ...defaultTimeline,
        timelineType: TimelineType.template,
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
        ...defaultTimeline,
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
        ...defaultTimeline,
      });
    });

    test('should merge columns when event.action is deleted without two extra column names of user.name', () => {
      const columnsWithoutEventAction = timelineDefaults.columns.filter(
        (column) => column.id !== 'event.action'
      );
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: columnsWithoutEventAction,
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        columns: columnsWithoutEventAction,
      });
    });

    test('should merge filters object back with json object', () => {
      const columnsWithoutEventAction = timelineDefaults.columns.filter(
        (column) => column.id !== 'event.action'
      );
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: columnsWithoutEventAction,
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
        ...defaultTimeline,
        columns: columnsWithoutEventAction,
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
        ...defaultTimeline,
        dateRange: { end: '2020-10-28T11:37:31.655Z', start: '2020-10-27T11:37:31.655Z' },
        status: TimelineStatus.immutable,
        timelineType: TimelineType.template,
        title: 'Awesome Timeline',
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
        ...defaultTimeline,
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        status: TimelineStatus.active,
        title: 'Awesome Timeline',
      });
    });
  });

  describe('queryTimelineById', () => {
    describe('encounters failure when retrieving a timeline', () => {
      const onError = jest.fn();
      const mockError = new Error('failed');

      const args = {
        timelineId: '123',
        onError,
        updateIsLoading: jest.fn(),
        updateTimeline: jest.fn(),
      };

      beforeAll(async () => {
        (resolveTimeline as jest.Mock).mockRejectedValue(mockError);
        queryTimelineById<{}>(args as unknown as QueryTimelineById<{}>);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('calls onError with the error', () => {
        expect(onError).toHaveBeenCalledWith(mockError, '123');
      });
    });

    describe('open a timeline', () => {
      const selectedTimeline = {
        ...mockSelectedTimeline,
      };

      const updateIsLoading = jest.fn();
      const onOpenTimeline = jest.fn();
      const onError = jest.fn();

      const args = {
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineType.default,
        onError,
        onOpenTimeline,
        openTimeline: true,
        updateIsLoading,
        updateTimeline: jest.fn(),
      };

      beforeAll(async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
        await queryTimelineById<{}>(args as unknown as QueryTimelineById<{}>);
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
        expect(resolveTimeline).toHaveBeenCalled();
      });

      test('it does not call onError when an error does not occur', () => {
        expect(onError).not.toHaveBeenCalled();
      });

      test('Do not override daterange if TimelineStatus is active', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.timeline', selectedTimeline)),
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
      const updateTimeline = jest.fn().mockImplementation(() => jest.fn());
      const selectedTimeline = { ...mockSelectedTimeline };

      const args = {
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineType.default,
        openTimeline: true,
        updateIsLoading,
        updateTimeline,
      };

      beforeAll(async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
        await queryTimelineById<{}>(args as unknown as QueryTimelineById<{}>);
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
        expect(resolveTimeline).toHaveBeenCalled();
      });

      test('should not override daterange if TimelineStatus is active', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.timeline', selectedTimeline)),
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
          resolveTimelineConfig: {
            outcome: 'exactMatch',
            alias_target_id: undefined,
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

    describe('open an immutable template', () => {
      const updateIsLoading = jest.fn();
      const template = { ...mockSelectedTemplate };
      const onOpenTimeline = jest.fn();
      const args = {
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
        (resolveTimeline as jest.Mock).mockResolvedValue(template);
        await queryTimelineById<{}>(args as unknown as QueryTimelineById<{}>);
      });

      afterAll(() => {
        (resolveTimeline as jest.Mock).mockReset();
        jest.clearAllMocks();
      });

      test('dispatch updateIsLoading to true', () => {
        expect(updateIsLoading.mock.calls[0][0]).toEqual({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('get timeline by Id', () => {
        expect(resolveTimeline).toHaveBeenCalled();
      });

      test('override daterange if TimelineStatus is immutable', () => {
        const { timeline } = formatTimelineResultToModel(
          omitTypenameInTimeline(getOr({}, 'data.timeline', template)),
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
      const result = omitTypenameInTimeline(mockGetOneTimelineResult);

      expect(result).toEqual(mockGetOneTimelineResult);
    });

    test('it returns timeline with __typename removed when it exists', () => {
      const mockTimeline = {
        ...mockGetOneTimelineResult,
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

    const defaultArgs = {
      duplicate: true,
      id: TimelineId.active,
      from: '2020-03-26T14:35:56.356Z',
      to: '2020-03-26T14:41:56.356Z',
      notes: [],
      timeline: mockTimelineModel,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      clock = sinon.useFakeTimers(unix);
      timelineDispatch = dispatchUpdateTimeline(dispatch);
    });

    afterEach(function () {
      clock.restore();
    });

    test('it invokes date range picker dispatch', () => {
      timelineDispatch(defaultArgs)();

      expect(dispatchSetTimelineRangeDatePicker).toHaveBeenCalledWith({
        from: '2020-03-26T14:35:56.356Z',
        to: '2020-03-26T14:41:56.356Z',
      });
    });

    test('it invokes add timeline dispatch', () => {
      timelineDispatch(defaultArgs)();

      expect(dispatchAddTimeline).toHaveBeenCalledWith({
        id: TimelineId.active,
        savedTimeline: true,
        timeline: mockTimelineModel,
      });
    });

    test('it does not invoke kql filter query dispatches if timeline.kqlQuery.filterQuery is null', () => {
      timelineDispatch(defaultArgs)();

      expect(dispatchApplyKqlFilterQuery).not.toHaveBeenCalled();
    });

    test('it does not invoke notes dispatch if duplicate is true', () => {
      timelineDispatch(defaultArgs)();

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
        ...defaultArgs,
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
        ...defaultArgs,
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
        ...defaultArgs,
        duplicate: false,
        notes: [
          {
            created: 1585233356356,
            updated: 1585233356356,
            noteId: 'note-id',
            note: 'I am a note',
          },
        ],
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
        ...defaultArgs,
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
