/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineNonEcsData } from '../../../../security_solution/common/search_strategy';
import {
  ColumnHeaderOptions,
  RowRendererId,
  TimelineExpandedDetail,
  SortColumnTimeline,
} from '../../../../security_solution/common/types/timeline';
import { TimelineModel } from '../../../../security_solution/public/';

export interface TGridModel {
  /** The columns displayed in the timeline */
  columns: ColumnHeaderOptions[];
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
