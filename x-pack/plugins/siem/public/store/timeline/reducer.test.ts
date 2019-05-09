/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash/fp';

import { ColumnHeader } from '../../components/timeline/body/column_headers/column_header';
import { defaultColumnHeaderType } from '../../components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  getColumnWidthFromType,
  DEFAULT_TIMELINE_WIDTH,
} from '../../components/timeline/body/helpers';
import { Direction } from '../../graphql/types';
import { defaultHeaders } from '../../mock';

import {
  addNewTimeline,
  addTimelineColumn,
  addTimelineProvider,
  applyDeltaToTimelineColumnWidth,
  removeTimelineColumn,
  removeTimelineProvider,
  updateTimelineColumns,
  updateTimelineDescription,
  updateTimelineItemsPerPage,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
  updateTimelineTitle,
} from './helpers';
import { timelineDefaults } from './model';
import { TimelineById } from './reducer';

const timelineByIdMock: TimelineById = {
  foo: {
    dataProviders: [
      {
        and: [],
        id: '123',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      },
    ],
    columns: [],
    description: '',
    eventIdToNoteIds: {},
    highlightedDropAndProviderId: '',
    historyIds: [],
    id: 'foo',
    isFavorite: false,
    isLive: false,
    itemsPerPage: 25,
    itemsPerPageOptions: [10, 25, 50],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: null, filterQueryDraft: null },
    title: '',
    noteIds: [],
    pinnedEventIds: {},
    range: '1 Day',
    show: true,
    sort: {
      columnId: '@timestamp',
      sortDirection: Direction.desc,
    },
    width: DEFAULT_TIMELINE_WIDTH,
  },
};

const columnsMock: ColumnHeader[] = [defaultHeaders[0], defaultHeaders[1], defaultHeaders[2]];

describe('Timeline', () => {
  describe('#addNewTimeline', () => {
    test('should return a new reference and not the same reference', () => {
      const update = addNewTimeline({
        id: 'bar',
        columns: defaultHeaders,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new timeline', () => {
      const update = addNewTimeline({
        id: 'bar',
        columns: timelineDefaults.columns,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual({
        foo: timelineByIdMock.foo,
        bar: set('id', 'bar', timelineDefaults),
      });
    });

    test('should add the specified columns to the timeline', () => {
      const barWithEmptyColumns = set('id', 'bar', timelineDefaults);
      const barWithPopulatedColumns = set('columns', defaultHeaders, barWithEmptyColumns);

      const update = addNewTimeline({
        id: 'bar',
        columns: defaultHeaders,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual({
        foo: timelineByIdMock.foo,
        bar: barWithPopulatedColumns,
      });
    });
  });

  describe('#updateTimelineShowTimeline', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineShowTimeline({
        id: 'foo',
        show: false,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should change show from true to false', () => {
      const update = updateTimelineShowTimeline({
        id: 'foo',
        show: false, // value we are changing from true to false
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.show', false, timelineByIdMock));
    });
  });

  describe('#addTimelineColumn', () => {
    const columnToAdd: ColumnHeader = {
      category: 'event',
      columnHeaderType: defaultColumnHeaderType,
      description:
        'The action captured by the event.\nThis describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
      example: 'user-password-change',
      id: 'event.action',
      type: 'keyword',
      width: DEFAULT_COLUMN_MIN_WIDTH,
    };

    test('should return a new reference and not the same reference', () => {
      const update = addTimelineColumn({
        id: 'foo',
        column: columnToAdd,
        timelineById: timelineByIdMock,
      });

      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new column to an empty collection of columns', () => {
      const update = addTimelineColumn({
        id: 'foo',
        column: columnToAdd,
        timelineById: timelineByIdMock,
      });

      const addedColumn = timelineByIdMock.foo.columns.concat(columnToAdd);
      expect(update).toEqual(set('foo.columns', addedColumn, timelineByIdMock));
    });

    test('should add a new column to an existing collection of columns', () => {
      const expectedColumns = columnsMock.concat(columnToAdd);
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = addTimelineColumn({
        id: 'foo',
        column: columnToAdd,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT add an additional new column if it already exists', () => {
      const expectedColumns = cloneDeep(columnsMock);
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);
      const preExisting = cloneDeep(mockWithExistingColumns.foo.columns[1]);

      const update = addTimelineColumn({
        id: 'foo',
        column: preExisting,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT MODIFY an existing column if it already exists', () => {
      const expectedColumns = cloneDeep(columnsMock);
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const differentDescription = {
        ...mockWithExistingColumns.foo.columns[1],
        description: 'this is a different description',
      };

      const update = addTimelineColumn({
        id: 'foo',
        column: differentDescription,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#addTimelineProvider', () => {
    test('should return a new reference and not the same reference', () => {
      const update = addTimelineProvider({
        id: 'foo',
        provider: {
          and: [],
          id: '567',
          name: 'data provider 2',
          enabled: true,
          queryMatch: {
            field: '',
            value: '',
          },

          excluded: false,
          kqlQuery: '',
        },
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new timeline provider', () => {
      const providerToAdd = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      const addedDataProvider = timelineByIdMock.foo.dataProviders.concat(providerToAdd);
      expect(update).toEqual(set('foo.dataProviders', addedDataProvider, timelineByIdMock));
    });

    test('should NOT add a new timeline provider if it already exists', () => {
      const providerToAdd = {
        and: [],
        id: '123',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(timelineByIdMock);
    });

    test('should UPSERT an existing timeline provider if it already exists', () => {
      const providerToAdd = {
        and: [],
        id: '123',
        name: 'my name changed',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders[0].name', 'my name changed', timelineByIdMock));
    });
  });

  describe('#removeTimelineColumn', () => {
    test('should return a new reference and not the same reference', () => {
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[0].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).not.toBe(timelineByIdMock);
    });

    test('should remove just the first column when the id matches', () => {
      const expectedColumns = [columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[0].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should remove just the last column when the id matches', () => {
      const expectedColumns = [columnsMock[0], columnsMock[1]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[2].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should remove just the middle column when the id matches', () => {
      const expectedColumns = [columnsMock[0], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[1].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should not modify the columns if the id to remove was not found', () => {
      const expectedColumns = cloneDeep(columnsMock);

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: 'does.not.exist',
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#applyDeltaToColumnWidth', () => {
    test('should return a new reference and not the same reference', () => {
      const delta = 50;
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: columnsMock[0].id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update (just) the specified column of type `date` when the id matches, and the result of applying the delta is greater than the min width for a date column', () => {
      const aDateColumn = columnsMock[0];
      const delta = 50;
      const expectedToHaveNewWidth = {
        ...aDateColumn,
        width: getColumnWidthFromType(aDateColumn.type!) + delta,
      };
      const expectedColumns = [expectedToHaveNewWidth, columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT update (just) the specified column of type `date` when the id matches, because the result of applying the delta is less than the min width for a date column', () => {
      const aDateColumn = columnsMock[0];
      const delta = -50; // this will be less than the min
      const expectedToHaveNewWidth = {
        ...aDateColumn,
        width: getColumnWidthFromType(aDateColumn.type!), // we expect the minimum
      };
      const expectedColumns = [expectedToHaveNewWidth, columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should update (just) the specified non-date column when the id matches, and the result of applying the delta is greater than the min width for the column', () => {
      const aNonDateColumn = columnsMock[1];
      const delta = 50;
      const expectedToHaveNewWidth = {
        ...aNonDateColumn,
        width: getColumnWidthFromType(aNonDateColumn.type!) + delta,
      };
      const expectedColumns = [columnsMock[0], expectedToHaveNewWidth, columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aNonDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT update the specified non-date column when the id matches, because the result of applying the delta is less than the min width for the column', () => {
      const aNonDateColumn = columnsMock[1];
      const delta = -50;
      const expectedToHaveNewWidth = {
        ...aNonDateColumn,
        width: getColumnWidthFromType(aNonDateColumn.type!),
      };
      const expectedColumns = [columnsMock[0], expectedToHaveNewWidth, columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aNonDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#addAndProviderToTimelineProvider', () => {
    test('should add a new and provider to an existing timeline provider', () => {
      const providerToAdd = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      const newTimeline = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });

      newTimeline.foo.highlightedDropAndProviderId = '567';

      const andProviderToAdd = {
        and: [],
        id: '568',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      const update = addTimelineProvider({
        id: 'foo',
        provider: andProviderToAdd,
        timelineById: newTimeline,
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      const addedAndDataProvider = update.foo.dataProviders[indexProvider].and[0];
      expect(addedAndDataProvider).toEqual(andProviderToAdd);
      newTimeline.foo.highlightedDropAndProviderId = '';
    });

    test('should NOT add a new timeline and provider if it already exists', () => {
      const providerToAdd = {
        and: [
          {
            and: [],
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      const newTimeline = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });

      newTimeline.foo.highlightedDropAndProviderId = '567';

      const andProviderToAdd = {
        and: [],
        id: '568',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      const update = addTimelineProvider({
        id: 'foo',
        provider: andProviderToAdd,
        timelineById: newTimeline,
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      expect(update.foo.dataProviders[indexProvider].and.length).toEqual(1);
      newTimeline.foo.highlightedDropAndProviderId = '';
    });
  });

  describe('#updateTimelineColumns', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineColumns({
        id: 'foo',
        columns: columnsMock,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update a timeline with new columns', () => {
      const update = updateTimelineColumns({
        id: 'foo',
        columns: columnsMock,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.columns', [...columnsMock], timelineByIdMock));
    });
  });

  describe('#updateTimelineDescription', () => {
    const newDescription = 'a new description';

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: newDescription,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline description', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: newDescription,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.description', newDescription, timelineByIdMock));
    });

    test('should always trim all leading whitespace and allow only one trailing space', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: '      breathing room      ',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.description', 'breathing room ', timelineByIdMock));
    });
  });

  describe('#updateTimelineTitle', () => {
    const newTitle = 'a new title';

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: newTitle,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline title', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: newTitle,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.title', newTitle, timelineByIdMock));
    });

    test('should always trim all leading whitespace and allow only one trailing space', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: '      room at the back      ',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.title', 'room at the back ', timelineByIdMock));
    });
  });

  describe('#updateTimelineProviders', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviders({
        id: 'foo',
        providers: [
          {
            and: [],
            id: '567',
            name: 'data provider 2',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add update a timeline with new providers', () => {
      const providerToAdd = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = updateTimelineProviders({
        id: 'foo',
        providers: [providerToAdd],
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders', [providerToAdd], timelineByIdMock));
    });
  });

  describe('#updateTimelineRange', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineRange({
        id: 'foo',
        range: '1 Month',
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline range', () => {
      const update = updateTimelineRange({
        id: 'foo',
        range: '1 Month',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.range', '1 Month', timelineByIdMock));
    });
  });

  describe('#updateTimelineSort', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineSort({
        id: 'foo',
        sort: {
          columnId: 'some column',
          sortDirection: Direction.desc,
        },
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline range', () => {
      const update = updateTimelineSort({
        id: 'foo',
        sort: {
          columnId: 'some column',
          sortDirection: Direction.desc,
        },
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(
        set(
          'foo.sort',
          { columnId: 'some column', sortDirection: Direction.desc },
          timelineByIdMock
        )
      );
    });
  });

  describe('#updateTimelineProviderEnabled', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should return a new reference for data provider and not the same reference of data provider', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline provider enabled from true to false', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // This value changed from true to false
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });

    test('should update only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 1',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: '',
          value: '',
        },
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // value we are updating from true to false
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
            {
              and: [],
              id: '456',
              name: 'data provider 1',
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelineAndProviderEnabled', () => {
    let timelineByIdwithAndMock: TimelineById = timelineByIdMock;
    beforeEach(() => {
      const providerToAdd = {
        and: [
          {
            and: [],
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      timelineByIdwithAndMock = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
    });

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update).not.toBe(timelineByIdwithAndMock);
    });

    test('should return a new reference for and data provider and not the same reference of data and provider', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline and provider enabled from true to false', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      expect(update.foo.dataProviders[indexProvider].and[0].enabled).toEqual(false);
    });

    test('should update only one and data provider and not two and data providers', () => {
      const indexProvider = timelineByIdwithAndMock.foo.dataProviders.findIndex(
        i => i.id === '567'
      );
      const multiAndDataProvider = timelineByIdwithAndMock.foo.dataProviders[
        indexProvider
      ].and.concat({
        and: [],
        id: '456',
        name: 'new and data provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiAndDataProviderMock = set(
        `foo.dataProviders[${indexProvider}].and`,
        multiAndDataProvider,
        timelineByIdwithAndMock
      );
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: multiAndDataProviderMock,
        andProviderId: '568',
      });
      const oldAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '568');
      const newAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '456');
      expect(oldAndProvider!.enabled).toEqual(false);
      expect(newAndProvider!.enabled).toEqual(true);
    });
  });

  describe('#updateTimelineProviderExcluded', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should return a new reference for data provider and not the same reference of data provider', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline provider excluded from true to false', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              excluded: true, // This value changed from true to false
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });

    test('should update only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 1',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: '',
          value: '',
        },
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              excluded: true, // value we are updating from false to true
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
            {
              and: [],
              id: '456',
              name: 'data provider 1',
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
              },
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelineAndProviderExcluded', () => {
    let timelineByIdwithAndMock: TimelineById = timelineByIdMock;
    beforeEach(() => {
      const providerToAdd = {
        and: [
          {
            and: [],
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      };

      timelineByIdwithAndMock = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
    });

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update).not.toBe(timelineByIdwithAndMock);
    });

    test('should return a new reference for and data provider and not the same reference of data and provider', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline and provider excluded from true to false', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      expect(update.foo.dataProviders[indexProvider].and[0].enabled).toEqual(true);
    });

    test('should update only one and data provider and not two and data providers', () => {
      const indexProvider = timelineByIdwithAndMock.foo.dataProviders.findIndex(
        i => i.id === '567'
      );
      const multiAndDataProvider = timelineByIdwithAndMock.foo.dataProviders[
        indexProvider
      ].and.concat({
        and: [],
        id: '456',
        name: 'new and data provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiAndDataProviderMock = set(
        `foo.dataProviders[${indexProvider}].and`,
        multiAndDataProvider,
        timelineByIdwithAndMock
      );
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: multiAndDataProviderMock,
        andProviderId: '568',
      });
      const oldAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '568');
      const newAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '456');
      expect(oldAndProvider!.excluded).toEqual(true);
      expect(newAndProvider!.excluded).toEqual(false);
    });
  });

  describe('#updateTimelineItemsPerPage', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineItemsPerPage({
        id: 'foo',
        itemsPerPage: 10, // value we are updating from 5 to 10
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the items per page from 25 to 50', () => {
      const update = updateTimelineItemsPerPage({
        id: 'foo',
        itemsPerPage: 50, // value we are updating from 25 to 50
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 50,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelinePerPageOptions', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelinePerPageOptions({
        id: 'foo',
        itemsPerPageOptions: [100, 200, 300], // value we are updating from [5, 10, 20]
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the items per page options from [10, 25, 50] to [100, 200, 300]', () => {
      const update = updateTimelinePerPageOptions({
        id: 'foo',
        itemsPerPageOptions: [100, 200, 300], // value we are updating from [10, 25, 50]
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          id: 'foo',
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [100, 200, 300], // updated
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#removeTimelineProvider', () => {
    test('should return a new reference and not the same reference', () => {
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should remove a timeline provider', () => {
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders', [], timelineByIdMock));
    });

    test('should remove only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '456',
              name: 'data provider 2',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          id: 'foo',
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
        },
      };
      expect(update).toEqual(expected);
    });
  });
});
