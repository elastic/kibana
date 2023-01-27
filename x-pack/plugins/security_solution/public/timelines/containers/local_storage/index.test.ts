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

import { mockDataTableModel, createSecuritySolutionStorageMock } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import type { DataTableModel } from '../../../common/store/data_table/model';
import { TableId } from '../../../../common/types';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const getExpectedColumns = (model: DataTableModel) =>
  model.columns.map(migrateColumnWidthToInitialWidth).map(migrateColumnLabelToDisplayAsText);

const { isLoading, loadingText, queryFields, unit, ...timelineToStore } = mockDataTableModel;

describe('SiemLocalStorage', () => {
  const { localStorage, storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    useKibanaMock().services.storage = storage;
    localStorage.clear();
  });

  describe('addDataTable', () => {
    it('adds a timeline when storage is empty', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });
  });

  describe('getAllDataTables', () => {
    it('gets all timelines correctly', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
      const timelines = tablesStorage.getAllDataTables();
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });

    it('returns an empty object if there is no timelines', () => {
      const tablesStorage = useDataTablesStorage();
      const timelines = tablesStorage.getAllDataTables();
      expect(timelines).toEqual({});
    });
  });

  describe('getDataTablesById', () => {
    it('gets a timeline by id', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      const timeline = tablesStorage.getDataTablesById(TableId.hostsPageEvents);
      expect(timeline).toEqual(timelineToStore);
    });
  });

  describe('getDataTablesInStorageByIds', () => {
    storage.set('timelines', {
      [TableId.hostsPageEvents]: mockDataTableModel,
      [TableId.usersPageEvents]: mockDataTableModel,
    });

    it('gets timelines correctly', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
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
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      const timelines = getDataTablesInStorageByIds(storage, []);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when a specific timeline does not exists', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      const timelines = getDataTablesInStorageByIds(storage, [TableId.usersPageEvents]);
      expect(timelines).toEqual({});
    });

    it('returns timelines correctly when one exist and another not', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);
      expect(timelines).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('migrates columns saved to localstorage with a `width` to `initialWidth`', () => {
      const tablesStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedmockDataTableModel = {
        ...cloneDeep(mockDataTableModel),
        columns: mockDataTableModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
          initialWidth: undefined, // `initialWidth` must be undefined, otherwise the migration will not occur
        })),
      };
      storage.set('timelines', {
        [TableId.hostsPageEvents]: unmigratedmockDataTableModel,
      });
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);

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
            initialWidth: 98765,
            width: 98765,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockDataTableModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `width` to `initialWidth` when `initialWidth` is valid', () => {
      const tablesStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedmockDataTableModel = {
        ...cloneDeep(mockDataTableModel),
        columns: mockDataTableModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
        })),
      };
      storage.set('timelines', {
        [TableId.hostsPageEvents]: unmigratedmockDataTableModel,
      });
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
      const timelines = getDataTablesInStorageByIds(storage, [
        TableId.hostsPageEvents,
        TableId.usersPageEvents,
      ]);

      expect(timelines).toStrictEqual({
        [TableId.hostsPageEvents]: {
          ...timelineToStore,
          columns: timelineToStore.columns.map((c) => ({
            ...c,
            initialWidth: c.initialWidth, // initialWidth is unchanged
            width: 98765,
          })),
        },
        [TableId.usersPageEvents]: {
          ...timelineToStore,
          columns: getExpectedColumns(mockDataTableModel),
        },
      });
    });

    it('migrates columns saved to localstorage with a `label` to `displayAsText`', () => {
      const tablesStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedmockDataTableModel = {
        ...cloneDeep(mockDataTableModel),
        columns: mockDataTableModel.columns.map((c, i) => ({
          ...c,
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      storage.set('timelines', {
        [TableId.hostsPageEvents]: unmigratedmockDataTableModel,
      });
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
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
          columns: getExpectedColumns(mockDataTableModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `label` to `displayAsText` when `displayAsText` is valid', () => {
      const tablesStorage = useDataTablesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedmockDataTableModel = {
        ...cloneDeep(mockDataTableModel),
        columns: mockDataTableModel.columns.map((c, i) => ({
          ...c,
          displayAsText:
            'Label will NOT be migrated to displayAsText, because displayAsText already has a value',
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      tablesStorage.addDataTable(TableId.hostsPageEvents, unmigratedmockDataTableModel);
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
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
          columns: getExpectedColumns(mockDataTableModel),
        },
      });
    });

    it('does NOT migrate `columns` when `columns` is not an array', () => {
      const tablesStorage = useDataTablesStorage();

      const invalidColumnsmockDataTableModel = {
        ...cloneDeep(mockDataTableModel),
        columns: 'this is NOT an array',
      };
      tablesStorage.addDataTable(
        TableId.hostsPageEvents,
        invalidColumnsmockDataTableModel as unknown as DataTableModel
      );
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
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
          columns: getExpectedColumns(mockDataTableModel),
        },
      });
    });

    it('migrates legacy timeline tables saved in localstorage to the new key securityDataTable and schema for DataTableModel', () => {
      const detectionsPageLegacyTable = {
        id: 'alerts-page',
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            initialWidth: 200,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'ecs.version',
            initialWidth: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'tags',
            initialWidth: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Rule',
            id: 'kibana.alert.rule.name',
            initialWidth: 180,
            linkField: 'kibana.alert.rule.uuid',
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Severity',
            id: 'kibana.alert.severity',
            initialWidth: 105,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Risk Score',
            id: 'kibana.alert.risk_score',
            initialWidth: 100,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Reason',
            id: 'kibana.alert.reason',
            initialWidth: 450,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'process.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'file.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
          },
        ],
        defaultColumns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            initialWidth: 200,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Rule',
            id: 'kibana.alert.rule.name',
            initialWidth: 180,
            linkField: 'kibana.alert.rule.uuid',
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Severity',
            id: 'kibana.alert.severity',
            initialWidth: 105,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Risk Score',
            id: 'kibana.alert.risk_score',
            initialWidth: 100,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Reason',
            id: 'kibana.alert.reason',
            initialWidth: 450,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'process.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'file.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
          },
        ],
        dataViewId: 'security-solution-default',
        dateRange: {
          start: '2022-10-16T07:00:00.000Z',
          end: '2022-10-17T06:59:59.999Z',
        },
        deletedEventIds: [],
        excludedRowRendererIds: [
          'alert',
          'alerts',
          'auditd',
          'auditd_file',
          'library',
          'netflow',
          'plain',
          'registry',
          'suricata',
          'system',
          'system_dns',
          'system_endgame_process',
          'system_file',
          'system_fim',
          'system_security_event',
          'system_socket',
          'threat_match',
          'zeek',
        ],
        expandedDetail: {},
        filters: [],
        kqlQuery: {
          filterQuery: null,
        },
        indexNames: ['.alerts-security.alerts-default'],
        isSelectAllChecked: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        loadingEventIds: [],
        selectedEventIds: {},
        showCheckboxes: true,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ],
        savedObjectId: null,
        version: null,
        footerText: 'alerts',
        title: '',
        activeTab: 'query',
        prevActiveTab: 'query',
        dataProviders: [],
        description: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
          query: '',
          size: 100,
        },
        eventType: 'all',
        eventIdToNoteIds: {},
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        isSaving: false,
        kqlMode: 'filter',
        timelineType: 'default',
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        sessionViewConfig: null,
        show: false,
        status: 'draft',
        initialized: true,
        updated: 1665943295913,
      };
      storage.set('timelines', { [TableId.alertsOnAlertsPage]: detectionsPageLegacyTable });
      const detectionsPage = {
        columns: [
          { columnHeaderType: 'not-filtered', id: '@timestamp', initialWidth: 200 },
          {
            columnHeaderType: 'not-filtered',
            id: 'ecs.version',
            initialWidth: 180,
          },
          { columnHeaderType: 'not-filtered', id: 'tags', initialWidth: 180 },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Rule',
            id: 'kibana.alert.rule.name',
            initialWidth: 180,
            linkField: 'kibana.alert.rule.uuid',
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Severity',
            id: 'kibana.alert.severity',
            initialWidth: 105,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Risk Score',
            id: 'kibana.alert.risk_score',
            initialWidth: 100,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Reason',
            id: 'kibana.alert.reason',
            initialWidth: 450,
          },
          { columnHeaderType: 'not-filtered', id: 'host.name' },
          { columnHeaderType: 'not-filtered', id: 'user.name' },
          { columnHeaderType: 'not-filtered', id: 'process.name' },
          { columnHeaderType: 'not-filtered', id: 'file.name' },
          { columnHeaderType: 'not-filtered', id: 'source.ip' },
          { columnHeaderType: 'not-filtered', id: 'destination.ip' },
        ],
        defaultColumns: [
          { columnHeaderType: 'not-filtered', id: '@timestamp', initialWidth: 200 },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Rule',
            id: 'kibana.alert.rule.name',
            initialWidth: 180,
            linkField: 'kibana.alert.rule.uuid',
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Severity',
            id: 'kibana.alert.severity',
            initialWidth: 105,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Risk Score',
            id: 'kibana.alert.risk_score',
            initialWidth: 100,
          },
          {
            columnHeaderType: 'not-filtered',
            displayAsText: 'Reason',
            id: 'kibana.alert.reason',
            initialWidth: 450,
          },
          { columnHeaderType: 'not-filtered', id: 'host.name' },
          { columnHeaderType: 'not-filtered', id: 'user.name' },
          { columnHeaderType: 'not-filtered', id: 'process.name' },
          { columnHeaderType: 'not-filtered', id: 'file.name' },
          { columnHeaderType: 'not-filtered', id: 'source.ip' },
          { columnHeaderType: 'not-filtered', id: 'destination.ip' },
        ],
        dataViewId: 'security-solution-default',
        deletedEventIds: [],
        excludedRowRendererIds: [
          'alert',
          'alerts',
          'auditd',
          'auditd_file',
          'library',
          'netflow',
          'plain',
          'registry',
          'suricata',
          'system',
          'system_dns',
          'system_endgame_process',
          'system_file',
          'system_fim',
          'system_security_event',
          'system_socket',
          'threat_match',
          'zeek',
        ],
        expandedDetail: {},
        filters: [],
        indexNames: ['.alerts-security.alerts-default'],
        isSelectAllChecked: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        loadingEventIds: [],
        showCheckboxes: true,
        sort: [
          { columnId: '@timestamp', columnType: 'date', esTypes: ['date'], sortDirection: 'desc' },
        ],
        graphEventId: undefined,
        selectedEventIds: {},
        sessionViewConfig: null,
        selectAll: undefined,
        id: 'alerts-page',
        title: '',
        initialized: true,
        updated: 1665943295913,
        totalCount: 0,
      };
      const dataTables = getDataTablesInStorageByIds(storage, [TableId.alertsOnAlertsPage]);
      expect(dataTables).toStrictEqual({
        [TableId.alertsOnAlertsPage]: detectionsPage,
      });
    });
  });

  describe('getAllDataTablesInStorage', () => {
    it('gets timelines correctly', () => {
      const tablesStorage = useDataTablesStorage();
      tablesStorage.addDataTable(TableId.hostsPageEvents, mockDataTableModel);
      tablesStorage.addDataTable(TableId.usersPageEvents, mockDataTableModel);
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
      addTableInStorage(storage, TableId.hostsPageEvents, mockDataTableModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      addTableInStorage(storage, TableId.hostsPageEvents, mockDataTableModel);
      addTableInStorage(storage, TableId.usersPageEvents, mockDataTableModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TABLE_KEY))).toEqual({
        [TableId.hostsPageEvents]: timelineToStore,
        [TableId.usersPageEvents]: timelineToStore,
      });
    });
  });

  describe('migrateColumnWidthToInitialWidth', () => {
    it('migrates the `width` property to `initialWidth` for older columns saved to localstorage', () => {
      const column = {
        ...cloneDeep(mockDataTableModel.columns[0]),
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
      const column = cloneDeep(mockDataTableModel.columns[0]); // `column.width` does not exist

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190, // unchanged, because there is no `width` to migrate
      });
    });

    it('does NOT migrate the `width` property to `initialWidth` when the column read from localstorage already has a valid `initialWidth`', () => {
      const column = {
        ...cloneDeep(mockDataTableModel.columns[0]), // `column.initialWidth` already exists
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
        ...cloneDeep(mockDataTableModel.columns[0]),
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
      const column = cloneDeep(mockDataTableModel.columns[0]); // `column.label` does not exist

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190,
      });
    });

    it("leaves `displayAsText` unchanged when the column read from localstorage doesn't have a `label`", () => {
      const column = {
        ...cloneDeep(mockDataTableModel.columns[0]),
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
        ...cloneDeep(mockDataTableModel.columns[0]),
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
