/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, union } from 'lodash/fp';

import { isEmpty } from 'lodash';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { SessionViewConfig } from '../../../../common/types/session_view';
import type {
  DataExpandedDetail,
  DataExpandedDetailType,
} from '../../../../common/types/detail_panel';
import type { ColumnHeaderOptions } from '../../../../common/types';
import type { TableToggleDetailPanel } from './actions';
import type { TGridPersistInput, TableById } from './types';
import type { TGridModelSettings } from './model';

import { getTGridManageDefaults, tGridDefaults } from './defaults';
import type { SortColumnTable } from '../../components/data_table/types';

export const isNotNull = <T>(value: T | null): value is T => value !== null;
export type Maybe<T> = T | null;

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px

/** The minimum width of a resized column */
export const RESIZED_COLUMN_MIN_WITH = 70; // px

interface AddTableColumnParams {
  column: ColumnHeaderOptions;
  id: string;
  index: number;
  tableById: TableById;
}

interface TableNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

interface CreateTGridParams extends TGridPersistInput {
  tableById: TableById;
}

/** Adds a new `Table` to the provided collection of `TableById` */
export const createInitTGrid = ({ id, tableById, ...tGridProps }: CreateTGridParams): TableById => {
  const dataTable = tableById[id];
  return {
    ...tableById,
    [id]: {
      ...dataTable,
      ...tGridDefaults,
      ...tGridProps,
      isLoading: false,
    },
  };
};

/**
 * Adds or updates a column. When updating a column, it will be moved to the
 * new index
 */
export const upsertTableColumn = ({
  column,
  id,
  index,
  tableById,
}: AddTableColumnParams): TableById => {
  const dataTable = tableById[id];
  const alreadyExistsAtIndex = dataTable.columns.findIndex((c) => c.id === column.id);

  if (alreadyExistsAtIndex !== -1) {
    // remove the existing entry and add the new one at the specified index
    const reordered = dataTable.columns.filter((c) => c.id !== column.id);
    reordered.splice(index, 0, column); // ⚠️ mutation

    return {
      ...tableById,
      [id]: {
        ...dataTable,
        columns: reordered,
      },
    };
  }

  // add the new entry at the specified index
  const columns = [...dataTable.columns];
  columns.splice(index, 0, column); // ⚠️ mutation

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

interface RemoveTableColumnParams {
  id: string;
  columnId: string;
  tableById: TableById;
}

export const removeTableColumn = ({
  id,
  columnId,
  tableById,
}: RemoveTableColumnParams): TableById => {
  const dataTable = tableById[id];

  const columns = dataTable.columns.filter((c) => c.id !== columnId);

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

interface InitializeTgridParams {
  id: string;
  tableById: TableById;
  tGridSettingsProps: Partial<TGridModelSettings>;
}

export const setInitializeTgridSettings = ({
  id,
  tableById,
  tGridSettingsProps,
}: InitializeTgridParams): TableById => {
  const dataTable = tableById[id];

  return !dataTable?.initialized
    ? {
        ...tableById,
        [id]: {
          ...tGridDefaults,
          ...getTGridManageDefaults(id),
          ...dataTable,
          ...tGridSettingsProps,
          ...(!dataTable ||
          (isEmpty(dataTable.columns) && !isEmpty(tGridSettingsProps.defaultColumns))
            ? { columns: tGridSettingsProps.defaultColumns }
            : {}),
          sort: tGridSettingsProps.sort ?? tGridDefaults.sort,
          loadingEventIds: tGridDefaults.loadingEventIds,
          initialized: true,
        },
      }
    : tableById;
};

interface ApplyDeltaToTableColumnWidth {
  id: string;
  columnId: string;
  delta: number;
  tableById: TableById;
}

export const applyDeltaToTableColumnWidth = ({
  id,
  columnId,
  delta,
  tableById,
}: ApplyDeltaToTableColumnWidth): TableById => {
  const dataTable = tableById[id];

  const columnIndex = dataTable.columns.findIndex((c) => c.id === columnId);
  if (columnIndex === -1) {
    // the column was not found
    return {
      ...tableById,
      [id]: {
        ...dataTable,
      },
    };
  }

  const requestedWidth =
    (dataTable.columns[columnIndex].initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH) + delta; // raw change in width
  const initialWidth = Math.max(RESIZED_COLUMN_MIN_WITH, requestedWidth); // if the requested width is smaller than the min, use the min

  const columnWithNewWidth = {
    ...dataTable.columns[columnIndex],
    initialWidth,
  };

  const columns = [
    ...dataTable.columns.slice(0, columnIndex),
    columnWithNewWidth,
    ...dataTable.columns.slice(columnIndex + 1),
  ];

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

type Columns = Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
>;

export const updateTGridColumnOrder = ({
  columnIds,
  id,
  tableById,
}: {
  columnIds: string[];
  id: string;
  tableById: TableById;
}): TableById => {
  const dataTable = tableById[id];

  const columns = columnIds.reduce<Columns>((acc, cid) => {
    const columnIndex = dataTable.columns.findIndex((c) => c.id === cid);

    return columnIndex !== -1 ? [...acc, dataTable.columns[columnIndex]] : acc;
  }, []);

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

export const updateTGridColumnWidth = ({
  columnId,
  id,
  tableById,
  width,
}: {
  columnId: string;
  id: string;
  tableById: TableById;
  width: number;
}): TableById => {
  const dataTable = tableById[id];

  const columns = dataTable.columns.map((x) => ({
    ...x,
    initialWidth: x.id === columnId ? width : x.initialWidth,
  }));

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

interface UpdateTableColumnsParams {
  id: string;
  columns: ColumnHeaderOptions[];
  tableById: TableById;
}

export const updateTableColumns = ({
  id,
  columns,
  tableById,
}: UpdateTableColumnsParams): TableById => {
  const dataTable = tableById[id];
  return {
    ...tableById,
    [id]: {
      ...dataTable,
      columns,
    },
  };
};

interface UpdateTableSortParams {
  id: string;
  sort: SortColumnTable[];
  tableById: TableById;
}

export const updateTableSort = ({ id, sort, tableById }: UpdateTableSortParams): TableById => {
  const dataTable = tableById[id];
  return {
    ...tableById,
    [id]: {
      ...dataTable,
      sort,
    },
  };
};

interface UpdateTableItemsPerPageParams {
  id: string;
  itemsPerPage: number;
  tableById: TableById;
}

export const updateTableItemsPerPage = ({
  id,
  itemsPerPage,
  tableById,
}: UpdateTableItemsPerPageParams) => {
  const dataTable = tableById[id];
  return {
    ...tableById,
    [id]: {
      ...dataTable,
      itemsPerPage,
    },
  };
};

interface UpdateTablePerPageOptionsParams {
  id: string;
  itemsPerPageOptions: number[];
  tableById: TableById;
}

export const updateTablePerPageOptions = ({
  id,
  itemsPerPageOptions,
  tableById,
}: UpdateTablePerPageOptionsParams) => {
  const dataTable = tableById[id];
  return {
    ...tableById,
    [id]: {
      ...dataTable,
      itemsPerPageOptions,
    },
  };
};

interface SetDeletedTableEventsParams {
  id: string;
  eventIds: string[];
  isDeleted: boolean;
  tableById: TableById;
}

export const setDeletedTableEvents = ({
  id,
  eventIds,
  isDeleted,
  tableById,
}: SetDeletedTableEventsParams): TableById => {
  const dataTable = tableById[id];

  const deletedEventIds = isDeleted
    ? union(dataTable.deletedEventIds, eventIds)
    : dataTable.deletedEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  const selectedEventIds = Object.fromEntries(
    Object.entries(dataTable.selectedEventIds).filter(
      ([selectedEventId]) => !deletedEventIds.includes(selectedEventId)
    )
  );

  const isSelectAllChecked =
    Object.keys(selectedEventIds).length > 0 ? dataTable.isSelectAllChecked : false;

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      deletedEventIds,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface SetLoadingTableEventsParams {
  id: string;
  eventIds: string[];
  isLoading: boolean;
  tableById: TableById;
}

export const setLoadingTableEvents = ({
  id,
  eventIds,
  isLoading,
  tableById,
}: SetLoadingTableEventsParams): TableById => {
  const dataTable = tableById[id];

  const loadingEventIds = isLoading
    ? union(dataTable.loadingEventIds, eventIds)
    : dataTable.loadingEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      loadingEventIds,
    },
  };
};

interface SetSelectedTableEventsParams {
  id: string;
  eventIds: Record<string, TableNonEcsData[]>;
  isSelectAllChecked: boolean;
  isSelected: boolean;
  tableById: TableById;
}

export const setSelectedTableEvents = ({
  id,
  eventIds,
  isSelectAllChecked = false,
  isSelected,
  tableById,
}: SetSelectedTableEventsParams): TableById => {
  const dataTable = tableById[id];

  const selectedEventIds = isSelected
    ? { ...dataTable.selectedEventIds, ...eventIds }
    : omit(Object.keys(eventIds), dataTable.selectedEventIds);

  return {
    ...tableById,
    [id]: {
      ...dataTable,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

export const updateTableDetailsPanel = (action: TableToggleDetailPanel): DataExpandedDetail => {
  const { tabType, id, ...expandedDetails } = action;

  const panelViewOptions = new Set(['eventDetail', 'hostDetail', 'networkDetail', 'userDetail']);
  const expandedTabType = tabType ?? 'query';
  const newExpandDetails = {
    params: expandedDetails.params ? { ...expandedDetails.params } : {},
    panelView: expandedDetails.panelView,
  } as DataExpandedDetailType;
  return {
    [expandedTabType]: panelViewOptions.has(expandedDetails.panelView ?? '')
      ? newExpandDetails
      : {},
  };
};

export const updateTableGraphEventId = ({
  id,
  graphEventId,
  tableById,
}: {
  id: string;
  graphEventId: string;
  tableById: TableById;
}): TableById => {
  const table = tableById[id];

  return {
    ...tableById,
    [id]: {
      ...table,
      graphEventId,
    },
  };
};

export const updateTableSessionViewConfig = ({
  id,
  sessionViewConfig,
  tableById,
}: {
  id: string;
  sessionViewConfig: SessionViewConfig | null;
  tableById: TableById;
}): TableById => {
  const table = tableById[id];

  return {
    ...tableById,
    [id]: {
      ...table,
      sessionViewConfig,
    },
  };
};
