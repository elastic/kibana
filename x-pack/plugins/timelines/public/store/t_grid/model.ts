/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { FilterManager } from '../../../../../../src/plugins/data/public';
import { TimelineNonEcsData } from '../../../common/search_strategy';
import {
  ColumnHeaderOptions,
  RowRendererId,
  TimelineExpandedDetail,
  SortColumnTimeline,
} from '../../../common/types/timeline';

export interface TGridModel {
  /** The columns displayed in the timeline */
  columns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  /** Events to not be rendered **/
  deletedEventIds: string[];
  /** A list of Ids of excluded Row Renderers */
  excludedRowRendererIds: RowRendererId[];
  /** This holds the view information for the flyout when viewing timeline in a consuming view (i.e. hosts page) or the side panel in the primary timeline view */
  expandedDetail: TimelineExpandedDetail;
  /** When non-empty, display a graph view for this event */
  graphEventId?: string;
  /** Uniquely identifies the timeline */
  id: string;
  /** TO DO sourcerer @X define this */
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
  /** When true, shows checkboxes enabling selection. Selected events store in selectedEventIds **/
  showCheckboxes: boolean;
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: SortColumnTimeline[];
  /** Events selected on this timeline -- eventId to TimelineNonEcsData[] mapping of data required for batch actions **/
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  savedObjectId: string | null;
  version: string | null;
  // TODO clean up old manage timeline context to see if we need to move it to its own store
  documentType: string;
  defaultColumns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  filterManager?: FilterManager;
  footerText: string;
  loadingText: string;
  isTGridLoading: boolean;
  queryFields: string[];
  selectAll: boolean;
  title: string;
  unit?: (n: number) => string;
  // END
}

export type SubsetTGridModel = Readonly<
  Pick<
    TGridModel,
    | 'columns'
    | 'deletedEventIds'
    | 'excludedRowRendererIds'
    | 'expandedDetail'
    | 'loadingEventIds'
    | 'indexNames'
    | 'isSelectAllChecked'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'selectedEventIds'
    | 'showCheckboxes'
    | 'sort'
    | 'isLoading'
  >
>;
