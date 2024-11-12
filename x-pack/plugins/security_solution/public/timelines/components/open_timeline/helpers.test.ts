/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, getOr, omit } from 'lodash/fp';
import { waitFor, renderHook } from '@testing-library/react';

import { mockTimelineResults, mockGetOneTimelineResult } from '../../../common/mock';
import { timelineDefaults } from '../../store/defaults';
import type { QueryTimelineById } from './helpers';
import {
  defaultTimelineToTimelineModel,
  getNotesCount,
  getPinnedEventCount,
  isUntitled,
  omitTypenameInTimeline,
  useQueryTimelineById,
  formatTimelineResponseToModel,
} from './helpers';
import type { OpenTimelineResult } from './types';
import { TimelineId } from '../../../../common/types/timeline';
import {
  TimelineTypeEnum,
  TimelineStatusEnum,
  type ColumnHeaderResult,
  type RowRendererId,
} from '../../../../common/api/timeline';
import {
  mockTimeline as mockSelectedTimeline,
  mockTemplate as mockSelectedTemplate,
} from './__mocks__';
import { resolveTimeline } from '../../containers/api';
import { defaultUdtHeaders } from '../timeline/body/column_headers/default_headers';

jest.mock('../../../common/hooks/use_experimental_features');

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => jest.fn(),
  };
});
jest.mock('../../../common/store/inputs/actions');
jest.mock('../../../common/utils/normalize_time_range');
jest.mock('../../store/actions');
jest.mock('../../../common/store/app/actions');
jest.mock(
  '../../../common/components/discover_in_timeline/use_discover_in_timeline_context',
  () => {
    return {
      useDiscoverInTimelineContext: jest.fn().mockReturnValue({ resetDiscoverAppState: jest.fn() }),
    };
  }
);
jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuidv1()'),
    v4: jest.fn(() => 'uuidv4()'),
  };
});

const mockUpdateTimeline = jest.fn();
jest.mock('./use_update_timeline', () => {
  const actual = jest.requireActual('./use_update_timeline');
  return {
    ...actual,
    useUpdateTimeline: () => mockUpdateTimeline,
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
    type: 'date',
    esTypes: ['date'],
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
        columns: defaultUdtHeaders,
      });
    });

    test('if duplicates and timeline.timelineType is not matching with outcome timelineType it should return draft with empty title', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.default,
      };

      const newTimeline = defaultTimelineToTimelineModel(
        timeline,
        false,
        TimelineTypeEnum.template
      );
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        timelineType: TimelineTypeEnum.template,
        columns: defaultUdtHeaders,
      });
    });

    test('if duplicates and timeline.timelineType is not matching with outcome timelineType it should return draft with empty title template', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Template',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.template,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineTypeEnum.default);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        columns: defaultUdtHeaders,
        excludedRowRendererIds: [],
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
        columns: defaultUdtHeaders,
      });
    });

    test('should merge columns when event.action is deleted without two extra column names of user.name', () => {
      const columnsWithoutEventAction = timelineDefaults.columns.filter(
        (column) => column.id !== 'event.action'
      );
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: columnsWithoutEventAction as ColumnHeaderResult[],
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
        columns: columnsWithoutEventAction as ColumnHeaderResult[],
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
        status: TimelineStatusEnum.immutable,
        timelineType: TimelineTypeEnum.template,
      };

      const newTimeline = defaultTimelineToTimelineModel(
        timeline,
        false,
        TimelineTypeEnum.template
      );
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        dateRange: { end: '2020-10-28T11:37:31.655Z', start: '2020-10-27T11:37:31.655Z' },
        status: TimelineStatusEnum.immutable,
        timelineType: TimelineTypeEnum.template,
        title: 'Awesome Timeline',
        columns: defaultUdtHeaders,
        excludedRowRendererIds: [],
      });
    });

    test('should not override timerange if given a custom template or timeline', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.default,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineTypeEnum.default);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        status: TimelineStatusEnum.active,
        title: 'Awesome Timeline',
        columns: defaultUdtHeaders,
      });
    });

    test('should produce correct model', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.default,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineTypeEnum.default);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        status: TimelineStatusEnum.active,
        title: 'Awesome Timeline',
        timelineType: TimelineTypeEnum.default,
        defaultColumns: defaultUdtHeaders,
        columns: defaultUdtHeaders,
      });
    });

    test('should produce correct model if custom set of columns is passed', () => {
      const customColumns = defaultUdtHeaders.slice(0, 2);
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.default,
        columns: customColumns as ColumnHeaderResult[],
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineTypeEnum.default);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        status: TimelineStatusEnum.active,
        title: 'Awesome Timeline',
        timelineType: TimelineTypeEnum.default,
        defaultColumns: defaultUdtHeaders,
        columns: customColumns,
      });
    });

    test('should produce correct model if custom set of excludedRowRendererIds is passed', () => {
      const excludedRowRendererIds: RowRendererId[] = ['zeek'];
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: 'Awesome Timeline',
        version: '1',
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.default,
        excludedRowRendererIds,
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false, TimelineTypeEnum.default);
      expect(newTimeline).toEqual({
        ...defaultTimeline,
        dateRange: { end: '2020-07-08T08:20:18.966Z', start: '2020-07-07T08:20:18.966Z' },
        status: TimelineStatusEnum.active,
        title: 'Awesome Timeline',
        timelineType: TimelineTypeEnum.default,
        defaultColumns: defaultUdtHeaders,
        columns: defaultUdtHeaders,
        excludedRowRendererIds,
      });
    });
  });

  describe('queryTimelineById', () => {
    describe('encounters failure when retrieving a timeline', () => {
      const onError = jest.fn();
      const mockError = new Error('failed');

      const args: QueryTimelineById = {
        timelineId: '123',
        onError,
      };

      beforeAll(() => {
        (resolveTimeline as jest.Mock).mockRejectedValue(mockError);
        renderHook(() => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(args);
        });
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('calls onError with the error', () => {
        expect(onError).toHaveBeenCalledWith(mockError, '123');
      });
    });

    describe('open a timeline 1', () => {
      const selectedTimeline = {
        ...mockSelectedTimeline,
      };

      const onOpenTimeline = jest.fn();
      const onError = jest.fn();

      const args: QueryTimelineById = {
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineTypeEnum.default,
        onError,
        onOpenTimeline,
        openTimeline: true,
      };

      beforeAll(async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(args);
        });
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('get timeline by Id', () => {
        expect(resolveTimeline).toHaveBeenCalled();
      });

      test('it does not call onError when an error does not occur', () => {
        expect(onError).not.toHaveBeenCalled();
      });

      test('Do not override daterange if TimelineStatus is active', () => {
        const { timeline } = formatTimelineResponseToModel(
          omitTypenameInTimeline(getOr({}, 'data.timeline', selectedTimeline)),
          args.duplicate,
          args.timelineType
        );
        expect(onOpenTimeline).toBeCalledWith({
          ...timeline,
        });
      });
    });

    describe('update a timeline', () => {
      const selectedTimeline = { ...mockSelectedTimeline };
      const untitledTimeline = { ...mockSelectedTimeline, title: '' };
      const onOpenTimeline = jest.fn();
      const args: QueryTimelineById = {
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineTypeEnum.default,
        openTimeline: true,
      };

      beforeEach(async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      test('should get timeline by Id with correct statuses', async () => {
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          await queryTimelineById(args);
        });

        // expect(resolveTimeline).toHaveBeenCalled();
        const { timeline } = formatTimelineResponseToModel(
          omitTypenameInTimeline(getOr({}, 'data.timeline', selectedTimeline)),
          args.duplicate,
          args.timelineType
        );

        await waitFor(() => {
          expect(mockUpdateTimeline).toHaveBeenCalledWith({
            timeline: {
              ...timeline,
              graphEventId: '',
              show: true,
              dateRange: {
                start: '2020-07-07T08:20:18.966Z',
                end: '2020-07-08T08:20:18.966Z',
              },
            },
            preventSettingQuery: true,
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
      });

      test('should update timeline correctly when timeline is untitled', async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
        const newArgs: QueryTimelineById = {
          duplicate: false,
          graphEventId: '',
          timelineId: undefined,
          timelineType: TimelineTypeEnum.default,
          onOpenTimeline,
          openTimeline: true,
        };
        (resolveTimeline as jest.Mock).mockResolvedValue(untitledTimeline);
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(newArgs);
        });

        expect(mockUpdateTimeline).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: TimelineId.active,
            timeline: expect.objectContaining({
              columns: defaultUdtHeaders,
            }),
          })
        );
      });

      test('should update timeline correctly when timeline is already saved and onOpenTimeline is not provided', async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(mockSelectedTimeline);
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(args);
        });

        await waitFor(() => {
          expect(mockUpdateTimeline).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              timeline: expect.objectContaining({
                columns: mockSelectedTimeline.data.timeline.columns.map((col) => ({
                  columnHeaderType: col.columnHeaderType,
                  id: col.id,
                  initialWidth: defaultUdtHeaders.find((defaultCol) => col.id === defaultCol.id)
                    ?.initialWidth,
                })),
              }),
            })
          );
        });
      });

      test('should update timeline correctly when timeline is already saved and onOpenTimeline IS provided', async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(mockSelectedTimeline);
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(args);
        });

        waitFor(() => {
          expect(onOpenTimeline).toHaveBeenCalledWith(
            expect.objectContaining({
              columns: mockSelectedTimeline.data.timeline.columns.map((col) => ({
                columnHeaderType: col.columnHeaderType,
                id: col.id,
                initialWidth: defaultUdtHeaders.find((defaultCol) => col.id === defaultCol.id)
                  ?.initialWidth,
              })),
            })
          );
        });
      });
    });

    describe('open an immutable template', () => {
      const template = { ...mockSelectedTemplate };
      const onOpenTimeline = jest.fn();
      const args = {
        duplicate: false,
        graphEventId: '',
        timelineId: '',
        timelineType: TimelineTypeEnum.template,
        onOpenTimeline,
        openTimeline: true,
      };

      beforeAll(async () => {
        (resolveTimeline as jest.Mock).mockResolvedValue(template);
        renderHook(async () => {
          const queryTimelineById = useQueryTimelineById();
          queryTimelineById(args);
        });
      });

      afterAll(() => {
        (resolveTimeline as jest.Mock).mockReset();
        jest.clearAllMocks();
      });

      test('get timeline by Id', () => {
        expect(resolveTimeline).toHaveBeenCalled();
      });

      test('override daterange if TimelineStatus is immutable', () => {
        const { timeline } = formatTimelineResponseToModel(
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
    });
  });

  describe('omitTypenameInTimeline', () => {
    test('should not modify the passed in timeline if no __typename exists', () => {
      const result = omitTypenameInTimeline(mockGetOneTimelineResult);

      expect(result).toEqual(mockGetOneTimelineResult);
    });

    test('should return timeline with __typename removed when it exists', () => {
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
});
