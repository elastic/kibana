/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortColumnTimeline } from '../../../common/types';
import { tGridDefaults } from './defaults';
import {
  setInitializeTgridSettings,
  updateTGridColumnOrder,
  updateTGridColumnWidth,
} from './helpers';
import { mockGlobalState } from '../../mock/global_state';

import { TGridModelSettings } from '.';

const id = 'foo';
const defaultTimelineById = {
  ...mockGlobalState.timelineById,
};

describe('setInitializeTgridSettings', () => {
  test('it returns the expected sort when tGridSettingsProps has an override', () => {
    const sort: SortColumnTimeline[] = [
      { columnId: 'foozle', columnType: 'date', sortDirection: 'asc' },
    ];

    const tGridSettingsProps: Partial<TGridModelSettings> = {
      footerText: 'test',
      sort, // <-- override
    };

    expect(
      setInitializeTgridSettings({ id, timelineById: defaultTimelineById, tGridSettingsProps })[id]
        .sort
    ).toEqual(sort);
  });

  test('it returns the default sort when tGridSettingsProps does NOT contain an override', () => {
    const tGridSettingsProps = { footerText: 'test' }; // <-- no `sort` override

    expect(
      setInitializeTgridSettings({ id, timelineById: defaultTimelineById, tGridSettingsProps })[id]
        .sort
    ).toEqual(tGridDefaults.sort);
  });

  test('it doesn`t overwrite the timeline if it is initialized', () => {
    const tGridSettingsProps = { title: 'testTitle' };

    const timelineById = {
      [id]: {
        ...defaultTimelineById.test,
        initialized: true,
      },
    };

    const result = setInitializeTgridSettings({ id, timelineById, tGridSettingsProps });
    expect(result).toBe(timelineById);
  });
});

describe('updateTGridColumnOrder', () => {
  test('it returns the columns in the new expected order', () => {
    const originalIdOrder = defaultTimelineById.test.columns.map((x) => x.id); // ['@timestamp', 'event.severity', 'event.category', '...']

    // the new order swaps the positions of the first and second columns:
    const newIdOrder = [originalIdOrder[1], originalIdOrder[0], ...originalIdOrder.slice(2)]; // ['event.severity', '@timestamp', 'event.category', '...']

    expect(
      updateTGridColumnOrder({
        columnIds: newIdOrder,
        id: 'test',
        timelineById: defaultTimelineById,
      })
    ).toEqual({
      ...defaultTimelineById,
      test: {
        ...defaultTimelineById.test,
        columns: [
          defaultTimelineById.test.columns[1], // event.severity
          defaultTimelineById.test.columns[0], // @timestamp
          ...defaultTimelineById.test.columns.slice(2), // all remaining columns
        ],
      },
    });
  });

  test('it omits unknown column IDs when re-ordering columns', () => {
    const originalIdOrder = defaultTimelineById.test.columns.map((x) => x.id); // ['@timestamp', 'event.severity', 'event.category', '...']
    const unknownColumId = 'does.not.exist';
    const newIdOrder = [originalIdOrder[0], unknownColumId, ...originalIdOrder.slice(1)]; // ['@timestamp', 'does.not.exist', 'event.severity', 'event.category', '...']

    expect(
      updateTGridColumnOrder({
        columnIds: newIdOrder,
        id: 'test',
        timelineById: defaultTimelineById,
      })
    ).toEqual({
      ...defaultTimelineById,
      test: {
        ...defaultTimelineById.test,
      },
    });
  });

  test('it returns an empty collection of columns if none of the new column IDs are found', () => {
    const newIdOrder = ['this.id.does.NOT.exist', 'this.id.also.does.NOT.exist']; // all unknown IDs

    expect(
      updateTGridColumnOrder({
        columnIds: newIdOrder,
        id: 'test',
        timelineById: defaultTimelineById,
      })
    ).toEqual({
      ...defaultTimelineById,
      test: {
        ...defaultTimelineById.test,
        columns: [], // <-- empty, because none of the new column IDs match the old IDs
      },
    });
  });
});

describe('updateTGridColumnWidth', () => {
  test("it updates (only) the specified column's width", () => {
    const columnId = '@timestamp';
    const width = 1234;

    const expectedUpdatedColumn = {
      ...defaultTimelineById.test.columns[0], // @timestamp
      initialWidth: width,
    };

    expect(
      updateTGridColumnWidth({
        columnId,
        id: 'test',
        timelineById: defaultTimelineById,
        width,
      })
    ).toEqual({
      ...defaultTimelineById,
      test: {
        ...defaultTimelineById.test,
        columns: [expectedUpdatedColumn, ...defaultTimelineById.test.columns.slice(1)],
      },
    });
  });

  test('it is a noop if the the specified column is unknown', () => {
    const unknownColumId = 'does.not.exist';

    expect(
      updateTGridColumnWidth({
        columnId: unknownColumId,
        id: 'test',
        timelineById: defaultTimelineById,
        width: 90210,
      })
    ).toEqual({
      ...defaultTimelineById,
      test: {
        ...defaultTimelineById.test,
      },
    });
  });
});
