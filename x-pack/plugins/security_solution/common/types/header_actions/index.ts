/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridColumnCellActionProps,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import type { IFieldSubType } from '@kbn/es-query';
import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import type { ComponentType, JSXElementConstructor, ReactNode } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { OnRowSelected, SetEventsDeleted, SetEventsLoading } from '..';
import type { BrowserFields, TimelineNonEcsData } from '../../search_strategy';
import type { SortColumnTable } from '../data_table';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/**
 * A `DataTableCellAction` function accepts `data`, where each row of data is
 * represented as a `TimelineNonEcsData[]`. For example, `data[0]` would
 * contain a `TimelineNonEcsData[]` with the first row of data.
 *
 * A `DataTableCellAction` returns a function that has access to all the
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
export type DataTableCellAction = ({
  browserFields,
  data,
  ecsData,
  header,
  pageSize,
  scopeId,
  closeCellPopover,
}: {
  browserFields: BrowserFields;
  /** each row of data is represented as one TimelineNonEcsData[] */
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  pageSize: number;
  scopeId: string;
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
  | 'isExpandable'
  | 'isResizable'
> & {
  aggregatable?: boolean;
  dataTableCellActions?: DataTableCellAction[];
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  esTypes?: string[];
  example?: string | number | null;
  format?: string;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};
export interface HeaderActionProps {
  width: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: ({ isSelected }: { isSelected: boolean }) => void;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: SortColumnTable[];
  tabType: string;
  timelineId: string;
}

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;

type GenericActionRowCellRenderProps = Pick<
  EuiDataGridCellValueElementProps,
  'rowIndex' | 'columnId'
>;

export type RowCellRender =
  | JSXElementConstructor<GenericActionRowCellRenderProps>
  | ((props: GenericActionRowCellRenderProps) => JSX.Element)
  | JSXElementConstructor<ActionProps>
  | ((props: ActionProps) => JSX.Element);

export interface ActionProps {
  action?: RowCellRender;
  ariaRowindex: number;
  checked: boolean;
  columnId: string;
  columnValues: string;
  data: TimelineNonEcsData[];
  disabled?: boolean;
  ecsData: Ecs;
  eventId: string;
  eventIdToNoteIds?: Readonly<Record<string, string[]>>;
  index: number;
  isEventPinned?: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  refetch?: () => void;
  rowIndex: number;
  setEventsDeleted: SetEventsDeleted;
  setEventsLoading: SetEventsLoading;
  showCheckboxes: boolean;
  showNotes?: boolean;
  tabType?: string;
  timelineId: string;
  toggleShowNotes?: () => void;
  width?: number;
}

interface AdditionalControlColumnProps {
  ariaRowindex: number;
  actionsColumnWidth: number;
  columnValues: string;
  checked: boolean;
  onRowSelected: OnRowSelected;
  eventId: string;
  id: string;
  columnId: string;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  showCheckboxes: boolean;
  // Override these type definitions to support either a generic custom component or the one used in security_solution today.
  headerCellRender: HeaderCellRender;
  rowCellRender: RowCellRender;
}

export type ControlColumnProps = Omit<
  EuiDataGridControlColumn,
  keyof AdditionalControlColumnProps
> &
  Partial<AdditionalControlColumnProps>;
