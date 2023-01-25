/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { ExpandedDetail } from '../../../../common/types/detail_panel';
import type { SessionViewConfig } from '../../../../common/types/session_view';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import type { ColumnHeaderOptions, SortColumnTable } from '../../../../common/types';
import type { ViewSelection } from '../../components/events_viewer/summary_view_select';

export interface DataTableModelSettings {
  defaultColumns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  loadingText?: string | React.ReactNode;
  queryFields: string[];
  selectAll: boolean;
  /** When true, shows checkboxes enabling selection. Selected events store in selectedEventIds **/
  showCheckboxes: boolean;
  /**  Specifies which column the data table is sorted on, and the direction (ascending / descending) */
  sort: SortColumnTable[];
  title: string;
  unit?: (n: number) => string | React.ReactNode;
}

export type AlertPageFilterType = 'showOnlyThreatIndicatorAlerts' | 'showBuildingBlockAlerts';

export interface DataTableModel extends DataTableModelSettings {
  /** The columns displayed in the data table */
  columns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  /** Kibana data view id **/
  dataViewId: string | null; // null if legacy pre-8.0 data table
  /** Events to not be rendered **/
  deletedEventIds: string[];
  /** This holds the view information for the flyout when viewing data in a consuming view (i.e. hosts page) or the side panel in the primary data view */
  expandedDetail: ExpandedDetail;
  filters?: Filter[];
  /** When non-empty, display a graph view for this event */
  graphEventId?: string;
  /** Uniquely identifies the data table */
  id: string;
  indexNames: string[];
  isLoading: boolean;
  /** If selectAll checkbox in header is checked **/
  isSelectAllChecked: boolean;
  /** The number of items to show in a single page of results */
  itemsPerPage: number;
  /** Displays a series of choices that when selected, become the value of `itemsPerPage` */
  itemsPerPageOptions: number[];
  /** Events to be rendered as loading **/
  loadingEventIds: string[];
  /** Events selected on this timeline -- eventId to TimelineNonEcsData[] mapping of data required for bulk actions **/
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  initialized?: boolean;
  sessionViewConfig: SessionViewConfig | null;
  /** updated saved object timestamp */
  updated?: number;
  /** Total number of fetched events/alerts */
  totalCount: number;
  /* viewMode of the table */
  viewMode: ViewSelection;
  /* custom filters applicable to */
  additionalFilters: Record<AlertPageFilterType, boolean>;
}

export type SubsetDataTableModel = Readonly<
  Pick<
    DataTableModel,
    | 'columns'
    | 'defaultColumns'
    | 'dataViewId'
    | 'deletedEventIds'
    | 'expandedDetail'
    | 'filters'
    | 'indexNames'
    | 'isLoading'
    | 'isSelectAllChecked'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'loadingEventIds'
    | 'showCheckboxes'
    | 'sort'
    | 'selectedEventIds'
    | 'graphEventId'
    | 'sessionViewConfig'
    | 'queryFields'
    | 'title'
    | 'initialized'
    | 'selectAll'
    | 'totalCount'
    | 'viewMode'
    | 'additionalFilters'
  >
>;
