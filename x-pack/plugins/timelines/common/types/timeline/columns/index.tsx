/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

import { EuiDataGridColumn, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { IFieldSubType } from '@kbn/es-query';
import { BrowserFields } from '../../../search_strategy/index_fields';
import { TimelineNonEcsData } from '../../../search_strategy/timeline';
import { Ecs } from '../../../ecs';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/**
 * A `TGridCellAction` function accepts `data`, where each row of data is
 * represented as a `TimelineNonEcsData[]`. For example, `data[0]` would
 * contain a `TimelineNonEcsData[]` with the first row of data.
 *
 * A `TGridCellAction` returns a function that has access to all the
 * `EuiDataGridColumnCellActionProps`, _plus_ access to `data`,
 *  which enables code like the following example to be written:
 *
 * Example:
 * ```
 * ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
 *   const value = getMappedNonEcsValue({
 *     data: data[rowIndex], // access a specific row's values
 *     fieldName: columnId,
 *   });
 *
 *   return (
 *     <Component onClick={() => alert(`row ${rowIndex} col ${columnId} has value ${value}`)} iconType="heart">
 *       {'Love it'}
 *      </Component>
 *   );
 * };
 * ```
 */
export type TGridCellAction = ({
  browserFields,
  data,
  ecsData,
  header,
  pageSize,
  timelineId,
  closeCellPopover,
}: {
  browserFields: BrowserFields;
  /** each row of data is represented as one TimelineNonEcsData[] */
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  pageSize: number;
  timelineId: string;
  closeCellPopover?: () => void;
}) => (props: EuiDataGridColumnCellActionProps) => ReactNode;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  | 'actions'
  | 'defaultSortDirection'
  | 'display'
  | 'displayAsText'
  | 'id'
  | 'initialWidth'
  | 'isSortable'
  | 'schema'
> & {
  aggregatable?: boolean;
  tGridCellActions?: TGridCellAction[];
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  example?: string | number | null;
  format?: string;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: ({
    columnName,
    eventId,
    field,
    timelineId,
    truncate,
    values,
    linkValues,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    timelineId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
    linkValues?: string[] | null | undefined;
  }) => React.ReactNode;
}
