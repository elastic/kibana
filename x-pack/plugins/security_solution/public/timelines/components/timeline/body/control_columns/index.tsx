/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType, JSXElementConstructor } from 'react';
import { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { OnRowSelected } from '../../events';
import { ActionProps, Actions } from '../actions';
import { HeaderActions, HeaderActionProps } from '../actions/header_actions';

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

export const defaultControlColumn: ControlColumnProps = {
  id: 'default-timeline-control-column',
  headerCellRender: HeaderActions,
  rowCellRender: Actions,
};
