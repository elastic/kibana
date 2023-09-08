/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  DataTableState,
  DataTableModel,
  TableIdLiteral,
} from '@kbn/securitysolution-data-table';
import { TableId } from '@kbn/securitysolution-data-table';
import type { ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import { ALERTS_TABLE_REGISTRY_CONFIG_IDS, VIEW_SELECTION } from '../../../../common/constants';
import type { DataTablesStorage } from './types';
import { useKibana } from '../../../common/lib/kibana';

export const LOCAL_STORAGE_TABLE_KEY = 'securityDataTable';
const LOCAL_STORAGE_TIMELINE_KEY_LEGACY = 'timelines';
const EMPTY_TABLE = {} as {
  [K in TableIdLiteral]: DataTableModel;
};

/**
 * Migrates the values of the data table from the legacy timelines key to the securityDataTable key
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrateLegacyTimelinesToSecurityDataTable = (legacyTimelineTables: any) => {
  if (!legacyTimelineTables) {
    return EMPTY_TABLE;
  }

  return Object.keys(legacyTimelineTables).reduce((acc, timelineTableId) => {
    const timelineModel = legacyTimelineTables[timelineTableId];
    return {
      ...acc,
      [timelineTableId]: {
        defaultColumns: timelineModel.defaultColumns,
        dataViewId: timelineModel.dataViewId,
        excludedRowRendererIds: timelineModel.excludedRowRendererIds,
        filters: timelineModel.filters,
        indexNames: timelineModel.indexNames,
        loadingEventIds: timelineModel.loadingEventIds,
        isSelectAllChecked: timelineModel.isSelectAllChecked,
        itemsPerPage: timelineModel.itemsPerPage,
        itemsPerPageOptions: timelineModel.itemsPerPageOptions,
        showCheckboxes: timelineModel.showCheckboxes,
        graphEventId: timelineModel.graphEventId,
        sessionViewConfig: timelineModel.sessionViewConfig,
        selectAll: timelineModel.selectAll,
        id: timelineModel.id,
        title: timelineModel.title,
        initialized: timelineModel.initialized,
        updated: timelineModel.updated,
        sort: timelineModel.sort,
        selectedEventIds: timelineModel.selectedEventIds,
        deletedEventIds: timelineModel.deletedEventIds,
        expandedDetail: timelineModel.expandedDetail,
        totalCount: timelineModel.totalCount || 0,
        viewMode: VIEW_SELECTION.gridView,
        additionalFilters: {
          showBuildingBlockAlerts: false,
          showOnlyThreatIndicatorAlerts: false,
        },
        ...(Array.isArray(timelineModel.columns)
          ? {
              columns: timelineModel.columns
                .map(migrateColumnWidthToInitialWidth)
                .map(migrateColumnLabelToDisplayAsText),
            }
          : {}),
      },
    };
  }, {} as { [K in TableIdLiteral]: DataTableModel });
};

/*
 *
 *  This migraiton only works for upgrading from
 *  8.7 -> 8.8. Please do not edit this migration for any
 *  future release.
 *
 *  If there is a migration that is required to be done for
 *  any future release. It should written as a saperate piece of code
 *  and should be called after this migration
 *
 * **/

export const migrateAlertTableStateToTriggerActionsState = (
  storage: Storage,
  legacyDataTableState: DataTableState['dataTable']['tableById']
) => {
  const triggerActionsStateKey: Record<string, string> = {
    [TableId.alertsOnAlertsPage]: `detection-engine-alert-table-${ALERTS_TABLE_REGISTRY_CONFIG_IDS.ALERTS_PAGE}-gridView`,
    [TableId.alertsOnRuleDetailsPage]: `detection-engine-alert-table-${ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS}-gridView`,
  };

  const triggersActionsState = Object.keys(legacyDataTableState)
    .filter((tableKey) => {
      return tableKey in triggerActionsStateKey && !storage.get(triggerActionsStateKey[tableKey]);
    })
    .map((tableKey) => {
      const newKey = triggerActionsStateKey[
        tableKey as keyof typeof triggerActionsStateKey
      ] as string;
      return {
        [newKey]: {
          columns: legacyDataTableState[tableKey].columns,
          sort: legacyDataTableState[tableKey].sort.map((sortCandidate) => ({
            [sortCandidate.columnId]: { order: sortCandidate.sortDirection },
          })),
          visibleColumns: legacyDataTableState[tableKey].columns,
        },
      };
    });

  triggersActionsState.forEach((stateObj) =>
    Object.keys(stateObj).forEach((key) => {
      storage.set(key, stateObj[key]);
    })
  );
};

/*
 *
 * Used for migrating Alert Table from 8.8 => 8.9
 * */
export const migrateTriggerActionsVisibleColumnsAlertTable88xTo89 = (storage: Storage) => {
  const localStorageKeys = [
    `detection-engine-alert-table-${ALERTS_TABLE_REGISTRY_CONFIG_IDS.ALERTS_PAGE}-gridView`,
    `detection-engine-alert-table-${ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS}-gridView`,
  ];

  localStorageKeys.forEach((key) => {
    const alertTableData = storage.get(key);
    if (!alertTableData) {
      return;
    }
    if ('visibleColumns' in alertTableData) {
      const visibleColumns =
        alertTableData.visibleColumns as DataTableState['dataTable']['tableById'][string]['columns'];
      const v89CompliantFormat = visibleColumns.every((val: unknown) => typeof val === 'string');
      if (v89CompliantFormat) {
        return;
      }
      const newVisibleColumns = visibleColumns
        .map((visibleCol) => {
          if (typeof visibleCol === 'string') {
            // if column format is 8.9 compliant already
            return visibleCol;
          }
          // if column format is 8.8
          return visibleCol.id;
        })
        .filter(Boolean);

      storage.set(key, {
        ...alertTableData,
        visibleColumns: newVisibleColumns,
      });
    }
  });
};

/**
 * Migrates the value of the column's `width` property to `initialWidth`
 * when `width` is valid, and `initialWidth` is invalid
 */
export const migrateColumnWidthToInitialWidth = (
  column: ColumnHeaderOptions & { width?: number }
) => ({
  ...column,
  ...(Number.isInteger(column.width) && !Number.isInteger(column.initialWidth)
    ? { initialWidth: column.width }
    : column.initialWidth
    ? { initialWidth: column.initialWidth }
    : {}),
});

/**
 * Migrates the value of the column's `label` property to `displayAsText`
 * when `label` is valid, and `displayAsText` is `undefined`
 */
export const migrateColumnLabelToDisplayAsText = (
  column: ColumnHeaderOptions & { label?: string }
) => ({
  ...column,
  ...(!isEmpty(column.label) && column.displayAsText == null
    ? { displayAsText: column.label }
    : column.displayAsText
    ? { displayAsText: column.displayAsText }
    : {}),
});

export const getDataTablesInStorageByIds = (storage: Storage, tableIds: TableIdLiteral[]) => {
  let allDataTables = storage.get(LOCAL_STORAGE_TABLE_KEY);
  const legacyTimelineTables = storage.get(LOCAL_STORAGE_TIMELINE_KEY_LEGACY);

  if (!allDataTables) {
    if (legacyTimelineTables) {
      allDataTables = migrateLegacyTimelinesToSecurityDataTable(legacyTimelineTables);
    } else {
      return EMPTY_TABLE;
    }
  }

  migrateAlertTableStateToTriggerActionsState(storage, allDataTables);
  migrateTriggerActionsVisibleColumnsAlertTable88xTo89(storage);

  return tableIds.reduce((acc, tableId) => {
    const tableModel = allDataTables[tableId];
    if (!tableModel) {
      return {
        ...acc,
      };
    }

    return {
      ...acc,
      [tableId]: {
        ...tableModel,
        ...(tableModel.sort != null && !Array.isArray(tableModel.sort)
          ? { sort: [tableModel.sort] }
          : {}),
      },
    };
  }, {} as { [K in TableIdLiteral]: DataTableModel });
};

export const getAllDataTablesInStorage = (storage: Storage) => {
  let allDataTables = storage.get(LOCAL_STORAGE_TABLE_KEY);
  const legacyTimelineTables = storage.get(LOCAL_STORAGE_TIMELINE_KEY_LEGACY);
  if (!allDataTables) {
    if (legacyTimelineTables) {
      allDataTables = migrateLegacyTimelinesToSecurityDataTable(legacyTimelineTables);
    } else {
      return EMPTY_TABLE;
    }
  }
  return allDataTables;
};

export const addTableInStorage = (storage: Storage, id: TableIdLiteral, table: DataTableModel) => {
  const tableToStore = getSerializingTableToStore(table);
  const tables = getAllDataTablesInStorage(storage);
  storage.set(LOCAL_STORAGE_TABLE_KEY, {
    ...tables,
    [id]: tableToStore,
  });
};

const getSerializingTableToStore = (table: DataTableModel) => {
  // discard unneeded fields to make sure the object serialization works
  const { isLoading, loadingText, queryFields, unit, ...tableToStore } = table;
  return tableToStore;
};

export const useDataTablesStorage = (): DataTablesStorage => {
  const { storage } = useKibana().services;

  const getAllDataTables: DataTablesStorage['getAllDataTables'] = () =>
    getAllDataTablesInStorage(storage);

  const getDataTablesById: DataTablesStorage['getDataTablesById'] = (id: TableIdLiteral) =>
    getDataTablesInStorageByIds(storage, [id])[id] ?? null;

  const addDataTable: DataTablesStorage['addDataTable'] = (
    id: TableIdLiteral,
    table: DataTableModel
  ) => addTableInStorage(storage, id, table);

  return { getAllDataTables, getDataTablesById, addDataTable };
};

export type { DataTablesStorage };
