/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash/fp';
import { TimelineById } from '.';
import { defaultWidth } from '../../../components/timeline/body';
import { Direction } from '../../../graphql/types';
import {
  addNewTimeline,
  addTimelineProvider,
  removeTimelineProvider,
  updateTimelineItemsPerPage,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
} from './helpers';
import { timelineDefaults } from './model';

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
        queryDate: {
          from: 0,
          to: 1,
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
    itemsPerPage: 25,
    itemsPerPageOptions: [10, 25, 50],
    kqlMode: 'filter',
    kqlQuery: '',
    title: '',
    noteIds: [],
    pinnedEventIds: {},
    range: '1 Day',
    show: true,
    sort: {
      columnId: 'timestamp',
      sortDirection: Direction.descending,
    },
    width: defaultWidth,
  },
};

describe('Timeline', () => {
  describe('#addNewTimeline', () => {
    test('should return a new reference and not the same reference', () => {
      const update = addNewTimeline({
        id: 'bar',
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new timeline to empty timeline', () => {
      const update = addNewTimeline({
        id: 'bar',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual({
        foo: timelineByIdMock.foo,
        bar: set('id', 'bar', timelineDefaults),
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
          queryDate: {
            from: 0,
            to: 1,
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
        queryDate: {
          from: 0,
          to: 1,
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
        queryDate: {
          from: 0,
          to: 1,
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
        queryDate: {
          from: 0,
          to: 1,
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
            queryDate: {
              from: 0,
              to: 1,
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
        queryDate: {
          from: 0,
          to: 1,
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
          sortDirection: Direction.descending,
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
          sortDirection: Direction.descending,
        },
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(
        set(
          'foo.sort',
          { columnId: 'some column', sortDirection: Direction.descending },
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
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // This value changed from true to false
              queryMatch: {
                field: '',
                value: '',
              },
              queryDate: {
                from: 0,
                to: 1,
              },
              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          eventIdToNoteIds: {},
          historyIds: [],
          highlightedDropAndProviderId: '',
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: '',
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: defaultWidth,
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
        queryMatch: {
          field: '',
          value: '',
        },
        queryDate: {
          from: 0,
          to: 1,
        },
        excluded: false,
        kqlQuery: '',
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
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // value we are updating from true to false
              queryMatch: {
                field: '',
                value: '',
              },
              queryDate: {
                from: 0,
                to: 1,
              },
              excluded: false,
              kqlQuery: '',
            },
            {
              and: [],
              id: '456',
              name: 'data provider 1',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
              },
              queryDate: {
                from: 0,
                to: 1,
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
          kqlQuery: '',
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: defaultWidth,
        },
      };
      expect(update).toEqual(expected);
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
              queryDate: {
                from: 0,
                to: 1,
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
          kqlQuery: '',
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          pinnedEventIds: {},
          itemsPerPage: 50,
          itemsPerPageOptions: [10, 25, 50],
          width: defaultWidth,
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
              queryDate: {
                from: 0,
                to: 1,
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
          kqlQuery: '',
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [100, 200, 300], // updated
          width: defaultWidth,
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
        queryDate: {
          from: 0,
          to: 1,
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
              queryDate: {
                from: 0,
                to: 1,
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
          kqlQuery: '',
          title: '',
          noteIds: [],
          range: '1 Day',
          show: true,
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          pinnedEventIds: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: defaultWidth,
        },
      };
      expect(update).toEqual(expected);
    });
  });
});
