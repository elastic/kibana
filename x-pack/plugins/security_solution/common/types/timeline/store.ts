/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import {
  ColumnHeaderOptions,
  ColumnId,
  RowRendererId,
  TimelineExpandedDetail,
  TimelineTypeLiteral,
} from '.';

import { Direction } from '../../search_strategy';
import { DataProvider } from './data_provider';

export type KueryFilterQueryKind = 'kuery' | 'lucene' | 'eql';

export interface KueryFilterQuery {
  kind: KueryFilterQueryKind;
  expression: string;
}

export interface SerializedFilterQuery {
  kuery: KueryFilterQuery | null;
  serializedQuery: string;
}

export type SortDirection = 'none' | 'asc' | 'desc' | Direction;
export interface SortColumnTimeline {
  columnId: string;
  columnType: string;
  sortDirection: SortDirection;
}

export interface TimelinePersistInput {
  columns: ColumnHeaderOptions[];
  dataProviders?: DataProvider[];
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  dateRange?: {
    start: string;
    end: string;
  };
  defaultColumns?: ColumnHeaderOptions[];
  excludedRowRendererIds?: RowRendererId[];
  expandedDetail?: TimelineExpandedDetail;
  filters?: Filter[];
  id: string;
  indexNames: string[];
  itemsPerPage?: number;
  kqlQuery?: {
    filterQuery: SerializedFilterQuery | null;
  };
  show?: boolean;
  sort?: SortColumnTimeline[];
  showCheckboxes?: boolean;
  timelineType?: TimelineTypeLiteral;
  templateTimelineId?: string | null;
  templateTimelineVersion?: number | null;
}

/** Invoked when a column is sorted */
export type OnColumnSorted = (sorted: { columnId: ColumnId; sortDirection: SortDirection }) => void;

export type OnColumnsSorted = (
  sorted: Array<{ columnId: ColumnId; sortDirection: SortDirection }>
) => void;

export type OnColumnRemoved = (columnId: ColumnId) => void;

export type OnColumnResized = ({ columnId, delta }: { columnId: ColumnId; delta: number }) => void;

/** Invoked when a user clicks to load more item */
export type OnChangePage = (nextPage: number) => void;

/** Invoked when a user checks/un-checks a row */
export type OnRowSelected = ({
  eventIds,
  isSelected,
}: {
  eventIds: string[];
  isSelected: boolean;
}) => void;

/** Invoked when a user checks/un-checks the select all checkbox  */
export type OnSelectAll = ({ isSelected }: { isSelected: boolean }) => void;

/** Invoked when columns are updated */
export type OnUpdateColumns = (columns: ColumnHeaderOptions[]) => void;

/** Invoked when a user pins an event */
export type OnPinEvent = (eventId: string) => void;

/** Invoked when a user unpins an event */
export type OnUnPinEvent = (eventId: string) => void;
