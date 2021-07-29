/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ComponentType, JSXElementConstructor } from 'react';
import { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';

import { OnRowSelected, SortColumnTimeline, TimelineTabs } from '..';
import { BrowserFields } from '../../../search_strategy/index_fields';
import { ColumnHeaderOptions } from '../columns';
import { TimelineNonEcsData } from '../../../search_strategy';
import { Ecs } from '../../../ecs';

export interface ActionProps {
  ariaRowindex: number;
  action?: RowCellRender;
  width?: number;
  columnId: string;
  columnValues: string;
  checked: boolean;
  onRowSelected: OnRowSelected;
  eventId: string;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  showCheckboxes: boolean;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  index: number;
  eventIdToNoteIds?: Readonly<Record<string, string[]>>;
  isEventPinned?: boolean;
  isEventViewer?: boolean;
  rowIndex: number;
  refetch?: () => void;
  onRuleChange?: () => void;
  showNotes?: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  toggleShowNotes?: () => void;
}

export interface HeaderActionProps {
  width: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: ({ isSelected }: { isSelected: boolean }) => void;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: SortColumnTimeline[];
  tabType: TimelineTabs;
  timelineId: string;
}

export type GenericActionRowCellRenderProps = Pick<
  EuiDataGridCellValueElementProps,
  'rowIndex' | 'columnId'
>;

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;
export type RowCellRender =
  | JSXElementConstructor<GenericActionRowCellRenderProps>
  | ((props: GenericActionRowCellRenderProps) => JSX.Element)
  | JSXElementConstructor<ActionProps>
  | ((props: ActionProps) => JSX.Element);

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
  // If not provided, calculated dynamically
  width?: number;
}

export type ControlColumnProps = Omit<
  EuiDataGridControlColumn,
  keyof AdditionalControlColumnProps
> &
  Partial<AdditionalControlColumnProps>;

export type OnAlertStatusActionSuccess = (status: AlertStatus) => void;
export type OnAlertStatusActionFailure = (status: AlertStatus, error: string) => void;
export interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: OnAlertStatusActionSuccess;
  onAlertStatusActionFailure?: OnAlertStatusActionFailure;
}
export type BulkActionsProp = boolean | BulkActionsObjectProp;

export type AlertStatus = 'open' | 'closed' | 'in-progress';
