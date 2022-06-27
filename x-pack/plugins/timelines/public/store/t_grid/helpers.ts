/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, union } from 'lodash/fp';

import { isEmpty } from 'lodash';
import { EuiDataGridColumn } from '@elastic/eui';
import type { ToggleDetailPanel } from './actions';
import { TGridPersistInput, TimelineById, TimelineId } from './types';
import type { TGridModel, TGridModelSettings } from './model';

import type {
  ColumnHeaderOptions,
  DataProvider,
  SortColumnTimeline,
  TimelineExpandedDetail,
  TimelineExpandedDetailType,
} from '../../../common/types/timeline';
import { getTGridManageDefaults, tGridDefaults } from './defaults';

export const isNotNull = <T>(value: T | null): value is T => value !== null;
export type Maybe<T> = T | null;

enum TimelineTabs {
  query = 'query',
  graph = 'graph',
  notes = 'notes',
  pinned = 'pinned',
  eql = 'eql',
}

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px

/** The minimum width of a resized column */
export const RESIZED_COLUMN_MIN_WITH = 70; // px

export const shouldResetActiveTimelineContext = (
  id: string,
  oldTimeline: TGridModel,
  newTimeline: TGridModel
) => {
  if (id === TimelineId.active && oldTimeline.savedObjectId !== newTimeline.savedObjectId) {
    return true;
  }
  return false;
};

interface AddTimelineColumnParams {
  column: ColumnHeaderOptions;
  id: string;
  index: number;
  timelineById: TimelineById;
}

interface TimelineNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

interface CreateTGridParams extends TGridPersistInput {
  timelineById: TimelineById;
}

/** Adds a new `Timeline` to the provided collection of `TimelineById` */
export const createInitTGrid = ({
  id,
  timelineById,
  ...tGridProps
}: CreateTGridParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      ...tGridDefaults,
      ...tGridProps,
      isLoading: false,
      savedObjectId: null,
      version: null,
    },
  };
};

/**
 * Adds or updates a column. When updating a column, it will be moved to the
 * new index
 */
export const upsertTimelineColumn = ({
  column,
  id,
  index,
  timelineById,
}: AddTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.columns.findIndex((c) => c.id === column.id);

  if (alreadyExistsAtIndex !== -1) {
    // remove the existing entry and add the new one at the specified index
    const reordered = timeline.columns.filter((c) => c.id !== column.id);
    reordered.splice(index, 0, column); // ⚠️ mutation

    return {
      ...timelineById,
      [id]: {
        ...timeline,
        columns: reordered,
      },
    };
  }

  // add the new entry at the specified index
  const columns = [...timeline.columns];
  columns.splice(index, 0, column); // ⚠️ mutation

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface RemoveTimelineColumnParams {
  id: string;
  columnId: string;
  timelineById: TimelineById;
}

export const removeTimelineColumn = ({
  id,
  columnId,
  timelineById,
}: RemoveTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];

  const columns = timeline.columns.filter((c) => c.id !== columnId);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface InitializeTgridParams {
  id: string;
  timelineById: TimelineById;
  tGridSettingsProps: Partial<TGridModelSettings>;
}

export const setInitializeTgridSettings = ({
  id,
  timelineById,
  tGridSettingsProps,
}: InitializeTgridParams): TimelineById => {
  const timeline = timelineById[id];

  return !timeline?.initialized
    ? {
        ...timelineById,
        [id]: {
          ...tGridDefaults,
          ...getTGridManageDefaults(id),
          ...timeline,
          ...tGridSettingsProps,
          ...(!timeline ||
          (isEmpty(timeline.columns) && !isEmpty(tGridSettingsProps.defaultColumns))
            ? { columns: tGridSettingsProps.defaultColumns }
            : {}),
          sort: tGridSettingsProps.sort ?? tGridDefaults.sort,
          loadingEventIds: tGridDefaults.loadingEventIds,
          initialized: true,
        },
      }
    : timelineById;
};

interface ApplyDeltaToTimelineColumnWidth {
  id: string;
  columnId: string;
  delta: number;
  timelineById: TimelineById;
}

export const applyDeltaToTimelineColumnWidth = ({
  id,
  columnId,
  delta,
  timelineById,
}: ApplyDeltaToTimelineColumnWidth): TimelineById => {
  const timeline = timelineById[id];

  const columnIndex = timeline.columns.findIndex((c) => c.id === columnId);
  if (columnIndex === -1) {
    // the column was not found
    return {
      ...timelineById,
      [id]: {
        ...timeline,
      },
    };
  }

  const requestedWidth =
    (timeline.columns[columnIndex].initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH) + delta; // raw change in width
  const initialWidth = Math.max(RESIZED_COLUMN_MIN_WITH, requestedWidth); // if the requested width is smaller than the min, use the min

  const columnWithNewWidth = {
    ...timeline.columns[columnIndex],
    initialWidth,
  };

  const columns = [
    ...timeline.columns.slice(0, columnIndex),
    columnWithNewWidth,
    ...timeline.columns.slice(columnIndex + 1),
  ];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
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
  timelineById,
}: {
  columnIds: string[];
  id: string;
  timelineById: TimelineById;
}): TimelineById => {
  const timeline = timelineById[id];

  const columns = columnIds.reduce<Columns>((acc, cid) => {
    const columnIndex = timeline.columns.findIndex((c) => c.id === cid);

    return columnIndex !== -1 ? [...acc, timeline.columns[columnIndex]] : acc;
  }, []);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

export const updateTGridColumnWidth = ({
  columnId,
  id,
  timelineById,
  width,
}: {
  columnId: string;
  id: string;
  timelineById: TimelineById;
  width: number;
}): TimelineById => {
  const timeline = timelineById[id];

  const columns = timeline.columns.map((x) => ({
    ...x,
    initialWidth: x.id === columnId ? width : x.initialWidth,
  }));

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface UpdateTimelineColumnsParams {
  id: string;
  columns: ColumnHeaderOptions[];
  timelineById: TimelineById;
}

export const updateTimelineColumns = ({
  id,
  columns,
  timelineById,
}: UpdateTimelineColumnsParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface UpdateTimelineSortParams {
  id: string;
  sort: SortColumnTimeline[];
  timelineById: TimelineById;
}

export const updateTimelineSort = ({
  id,
  sort,
  timelineById,
}: UpdateTimelineSortParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      sort,
    },
  };
};

interface UpdateTimelineItemsPerPageParams {
  id: string;
  itemsPerPage: number;
  timelineById: TimelineById;
}

export const updateTimelineItemsPerPage = ({
  id,
  itemsPerPage,
  timelineById,
}: UpdateTimelineItemsPerPageParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPage,
    },
  };
};

interface UpdateTimelinePerPageOptionsParams {
  id: string;
  itemsPerPageOptions: number[];
  timelineById: TimelineById;
}

export const updateTimelinePerPageOptions = ({
  id,
  itemsPerPageOptions,
  timelineById,
}: UpdateTimelinePerPageOptionsParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPageOptions,
    },
  };
};

interface SetDeletedTimelineEventsParams {
  id: string;
  eventIds: string[];
  isDeleted: boolean;
  timelineById: TimelineById;
}

export const setDeletedTimelineEvents = ({
  id,
  eventIds,
  isDeleted,
  timelineById,
}: SetDeletedTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const deletedEventIds = isDeleted
    ? union(timeline.deletedEventIds, eventIds)
    : timeline.deletedEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  const selectedEventIds = Object.fromEntries(
    Object.entries(timeline.selectedEventIds).filter(
      ([selectedEventId]) => !deletedEventIds.includes(selectedEventId)
    )
  );

  const isSelectAllChecked =
    Object.keys(selectedEventIds).length > 0 ? timeline.isSelectAllChecked : false;

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      deletedEventIds,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface SetLoadingTimelineEventsParams {
  id: string;
  eventIds: string[];
  isLoading: boolean;
  timelineById: TimelineById;
}

export const setLoadingTimelineEvents = ({
  id,
  eventIds,
  isLoading,
  timelineById,
}: SetLoadingTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const loadingEventIds = isLoading
    ? union(timeline.loadingEventIds, eventIds)
    : timeline.loadingEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      loadingEventIds,
    },
  };
};

interface SetSelectedTimelineEventsParams {
  id: string;
  eventIds: Record<string, TimelineNonEcsData[]>;
  isSelectAllChecked: boolean;
  isSelected: boolean;
  timelineById: TimelineById;
}

export const setSelectedTimelineEvents = ({
  id,
  eventIds,
  isSelectAllChecked = false,
  isSelected,
  timelineById,
}: SetSelectedTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const selectedEventIds = isSelected
    ? { ...timeline.selectedEventIds, ...eventIds }
    : omit(Object.keys(eventIds), timeline.selectedEventIds);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

export const updateTimelineDetailsPanel = (action: ToggleDetailPanel): TimelineExpandedDetail => {
  const { tabType, timelineId, ...expandedDetails } = action;

  const panelViewOptions = new Set(['eventDetail', 'hostDetail', 'networkDetail', 'userDetail']);
  const expandedTabType = tabType ?? TimelineTabs.query;
  const newExpandDetails = {
    params: expandedDetails.params ? { ...expandedDetails.params } : {},
    panelView: expandedDetails.panelView,
  } as TimelineExpandedDetailType;
  return {
    [expandedTabType]: panelViewOptions.has(expandedDetails.panelView ?? '')
      ? newExpandDetails
      : {},
  };
};

export const addProviderToTimelineHelper = (
  id: string,
  provider: DataProvider,
  timelineById: TimelineById
): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.dataProviders.findIndex((p) => p.id === provider.id);

  if (alreadyExistsAtIndex > -1 && !isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)) {
    provider.id = `${provider.id}-${
      timeline.dataProviders.filter((p) => p.id === provider.id).length
    }`;
  }

  const dataProviders =
    alreadyExistsAtIndex > -1 && isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)
      ? [
          ...timeline.dataProviders.slice(0, alreadyExistsAtIndex),
          provider,
          ...timeline.dataProviders.slice(alreadyExistsAtIndex + 1),
        ]
      : [...timeline.dataProviders, provider];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders,
    },
  };
};
