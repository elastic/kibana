/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import {
  migrateColumnWidthToInitialWidth,
  migrateColumnLabelToDisplayAsText,
  LOCAL_STORAGE_TABLE_KEY,
  useDataTablesStorage,
  getDataTablesInStorageByIds,
  getAllDataTablesInStorage,
  addTableInStorage,
} from '.';

import { TableId } from '../../../../common/types/timeline';
import { mockTGridModel, createSecuritySolutionStorageMock } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import type { TGridModel } from '../../../common/store/data_table/model';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const getExpectedColumns = (model: TGridModel) =>
  model.columns.map(migrateColumnWidthToInitialWidth).map(migrateColumnLabelToDisplayAsText);

const { isLoading, loadingText, queryFields, unit, ...timelineToStore } = mockTGridModel;

describe('SiemLocalStorage', () => {
  const { localStorage, storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    useKibanaMock().services.storage = storage;
    localStorage.clear();
  });

  describe('addDataTable', () => {
    it('adds a timeline when storage is empty', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });
  });

  describe('getAllDataTables', () => {
    it('gets all timelines correctly', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = timelineStorage.getAllDataTables();
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });

    it('returns an empty object if there is no timelines', () => {
      const timelineStorage = useDataTablesStorage();
      const timelines = timelineStorage.getAllDataTables();
      expect(timelines).toEqual({});
    });
  });

  describe('getDataTablesById', () => {
    it('gets a timeline by id', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      const timeline = timelineStorage.getDataTablesById(TableId.hostsPageEvents);
      expect(timeline).toEqual(timelineToStore);
    });
  });

  describe('getDataTablesInStorageByIds', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });

    it('gets an empty timelime when there is no timelines', () => {
      const timelines = getDataTablesInStorageByIds(storage, [TableId.hostsPageEvents]);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when there is no ids', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, []);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when a specific timeline does not exists', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [TableId.usersPageEvents]);
      expect(timelines).toEqual({});
    });

    it('returns timelines correctly when one exist and another not', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('migrates columns saved to localstorage with a `width` to `initialWidth`', () => {
      const timelineStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedmockTGridModel = {
        ...cloneDeep(mockTGridModel),
        columns: mockTGridModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
          initialWidth: undefined, // `initialWidth` must be undefined, otherwise the migration will not occur
        })),
      };
      timelineStorage.addDataTable(TableId.hostsPageEvents, unmigratedmockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      // all legacy `width` values are migrated to `initialWidth`:
      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: timelineToStore.columns.map((c) => ({
            ...c,
            displayAsText: undefined,
            initialWidth: 98765,
            width: 98765,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockTGridModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `width` to `initialWidth` when `initialWidth` is valid', () => {
      const timelineStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedmockTGridModel = {
        ...cloneDeep(mockTGridModel),
        columns: mockTGridModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
        })),
      };
      timelineStorage.addDataTable(TableId.hostsPageEvents, unmigratedmockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: timelineToStore.columns.map((c) => ({
            ...c,
            displayAsText: undefined,
            initialWidth: c.initialWidth, // initialWidth is unchanged
            width: 98765,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockTGridModel),
        },
      });
    });

    it('migrates columns saved to localstorage with a `label` to `displayAsText`', () => {
      const timelineStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedmockTGridModel = {
        ...cloneDeep(mockTGridModel),
        columns: mockTGridModel.columns.map((c, i) => ({
          ...c,
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      timelineStorage.addDataTable(TableId.hostsPageEvents, unmigratedmockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      // all legacy `label` values are migrated to `displayAsText`:
      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: timelineToStore.columns.map((c, i) => ({
            ...c,
            displayAsText: `A legacy label ${i}`,
            label: `A legacy label ${i}`,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockTGridModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `label` to `displayAsText` when `displayAsText` is valid', () => {
      const timelineStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedmockTGridModel = {
        ...cloneDeep(mockTGridModel),
        columns: mockTGridModel.columns.map((c, i) => ({
          ...c,
          displayAsText:
            'Label will NOT be migrated to displayAsText, because displayAsText already has a value',
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      timelineStorage.addDataTable(TableId.hostsPageEvents, unmigratedmockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: timelineToStore.columns.map((c, i) => ({
            ...c,
            displayAsText:
              'Label will NOT be migrated to displayAsText, because displayAsText already has a value',
            label: `A legacy label ${i}`,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockTGridModel),
        },
      });
    });

    it('does NOT migrate `columns` when `columns` is not an array', () => {
      const timelineStorage = useDataTablesStorage();

      const invalidColumnsmockTGridModel = {
        ...cloneDeep(mockTGridModel),
        columns: 'this is NOT an array',
      };
      timelineStorage.addDataTable(
        TableId.hostsPageEvents,
        invalidColumnsmockTGridModel as unknown as TGridModel
      );
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: 'this is NOT an array',
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockTGridModel),
        },
      });
    });
  });

  describe('getAllDataTablesInStorage', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useDataTablesStorage();
      timelineStorage.addDataTable(TableId.hostsPageEvents, mockTGridModel);
      timelineStorage.addDataTable(TableId.usersPageEvents, mockTGridModel);
      const timelines = getAllDataTablesInStorage(storage);
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });

    it('gets an empty timeline when there is no timelines', () => {
      const timelines = getAllDataTablesInStorage(storage);
      expect(timelines).toEqual({});
    });
  });

  describe('addTableInStorage', () => {
    it('adds a timeline when storage is empty', () => {
      addTableInStorage(storage, TableId.hostsPageEvents, mockTGridModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      addTableInStorage(storage, TableId.hostsPageEvents, mockTGridModel);
      addTableInStorage(storage, TableId.usersPageEvents, mockTGridModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });
  });

  describe('migrateColumnWidthToInitialWidth', () => {
    it('migrates the `width` property to `initialWidth` for older columns saved to localstorage', () => {
      const column = {
        ...cloneDeep(mockTGridModel.columns[0]),
        width: 1234, // the column `width` was saved to localstorage before the `initialWidth` property existed
        initialWidth: undefined, // `initialWidth` did not exist when this column was saved to localstorage
      };

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 1234, // migrated from `width`
        width: 1234,
      });
    });

    it("leaves `initialWidth` unchanged when the column read from localstorage doesn't have a `width`", () => {
      const column = cloneDeep(mockTGridModel.columns[0]); // `column.width` does not exist

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190, // unchanged, because there is no `width` to migrate
      });
    });

    it('does NOT migrate the `width` property to `initialWidth` when the column read from localstorage already has a valid `initialWidth`', () => {
      const column = {
        ...cloneDeep(mockTGridModel.columns[0]), // `column.initialWidth` already exists
        width: 1234,
      };

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190, // unchanged, because the column read from localstorge already has a valid `initialWidth`
        width: 1234,
      });
    });
  });

  describe('migrateColumnLabelToDisplayAsText', () => {
    it('migrates the `label` property to `displayAsText` for older columns saved to localstorage', () => {
      const column = {
        ...cloneDeep(mockTGridModel.columns[0]),
        label: 'A legacy label', // the column `label` was saved to localstorage before the `displayAsText` property existed
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'A legacy label', // migrated from `label`
        id: '@timestamp',
        initialWidth: 190,
        label: 'A legacy label',
      });
    });

    it("leaves `displayAsText` undefined when the column read from localstorage doesn't have a `label`", () => {
      const column = cloneDeep(mockTGridModel.columns[0]); // `column.label` does not exist

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: undefined, // undefined, because there is no `label` to migrate
        id: '@timestamp',
        initialWidth: 190,
      });
    });

    it("leaves `displayAsText` unchanged when the column read from localstorage doesn't have a `label`", () => {
      const column = {
        ...cloneDeep(mockTGridModel.columns[0]),
        displayAsText: 'Do NOT update this',
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'Do NOT update this', // unchanged, because there is no `label` to migrate
        id: '@timestamp',
        initialWidth: 190,
      });
    });

    it('does NOT migrate the `label` property to `displayAsText` when the column read from localstorage already has a valid `displayAsText`', () => {
      const column = {
        ...cloneDeep(mockTGridModel.columns[0]),
        displayAsText: 'Already valid',
        label: 'A legacy label',
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'Already valid', // unchanged, because the column read from localstorge already has a valid `displayAsText`
        label: 'A legacy label',
        id: '@timestamp',
        initialWidth: 190,
      });
    });
  });
});
