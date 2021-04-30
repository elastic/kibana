/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { IFieldSubType } from '../../../../../../src/plugins/data/public';
import {
  RowRendererId,
  TimelineExpandedDetail,
  SortColumnTimeline,
} from '../../../../security_solution/common/types/timeline';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  'display' | 'displayAsText' | 'id' | 'initialWidth'
> & {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string;
  example?: string;
  format?: string;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};

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
  /** The number of items to show in a single page of results */
  itemsPerPage: number;
  /** Displays a series of choices that when selected, become the value of `itemsPerPage` */
  itemsPerPageOptions: number[];
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: SortColumnTimeline[];
}
