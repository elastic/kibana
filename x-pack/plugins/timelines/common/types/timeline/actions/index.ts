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
import { FieldBrowserOptions } from '../../fields_browser';

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
  tabType?: TimelineTabs;
  timelineId: string;
  toggleShowNotes?: () => void;
  width?: number;
}

export type SetEventsLoading = (params: { eventIds: string[]; isLoading: boolean }) => void;
export type SetEventsDeleted = (params: { eventIds: string[]; isDeleted: boolean }) => void;
export type OnUpdateAlertStatusSuccess = (
  updated: number,
  conflicts: number,
  status: AlertStatus
) => void;
export type OnUpdateAlertStatusError = (status: AlertStatus, error: Error) => void;

export interface StatusBulkActionsProps {
  eventIds: string[];
  currentStatus?: AlertStatus;
  query?: string;
  indexName: string;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  onUpdateSuccess?: OnUpdateAlertStatusSuccess;
  onUpdateFailure?: OnUpdateAlertStatusError;
  timelineId?: string;
}
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
}

export type ControlColumnProps = Omit<
  EuiDataGridControlColumn,
  keyof AdditionalControlColumnProps
> &
  Partial<AdditionalControlColumnProps>;
export interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: OnUpdateAlertStatusSuccess;
  onAlertStatusActionFailure?: OnUpdateAlertStatusError;
}
export type BulkActionsProp = boolean | BulkActionsObjectProp;

export type AlertWorkflowStatus = 'open' | 'closed' | 'acknowledged';

/**
 * @deprecated
 * TODO: remove when `acknowledged` migrations are finished
 */
export type InProgressStatus = 'in-progress';

export type AlertStatus = AlertWorkflowStatus | InProgressStatus;
