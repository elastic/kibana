/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, JSXElementConstructor, useState } from 'react';
import {
  EuiDataGridControlColumn,
  EuiCheckbox,
  EuiButtonIcon,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverTitle,
  EuiSpacer,
  EuiDataGridCellValueElementProps,
} from '@elastic/eui';
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
  additionalActions?: JSX.Element[];
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

const SelectionHeaderCell = () => {
  return <EuiCheckbox id="selection-toggle" aria-label="Select all rows" onChange={() => null} />;
};

const SelectionRowCell = ({ rowIndex }: { rowIndex: number }) => {
  return (
    <div>
      <EuiCheckbox
        id={`${rowIndex}`}
        aria-label={`Select row test`}
        checked={false}
        onChange={() => null}
      />
    </div>
  );
};

const TestTrailingColumn = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="s"
        button={
          <EuiButtonIcon
            aria-label="show actions"
            iconType="boxesHorizontal"
            color="text"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          />
        }
        closePopover={() => setIsPopoverOpen(false)}
      >
        <EuiPopoverTitle>{'Actions'}</EuiPopoverTitle>
        <div style={{ width: 150 }}>
          <button type="button" onClick={() => {}}>
            <EuiFlexGroup alignItems="center" component="span" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon aria-label="Pin selected items" iconType="pin" color="text" />
              </EuiFlexItem>
              <EuiFlexItem>{'Pin'}</EuiFlexItem>
            </EuiFlexGroup>
          </button>
          <EuiSpacer size="s" />
          <button type="button" onClick={() => {}}>
            <EuiFlexGroup alignItems="center" component="span" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon aria-label="Delete selected items" iconType="trash" color="text" />
              </EuiFlexItem>
              <EuiFlexItem>{'Delete'}</EuiFlexItem>
            </EuiFlexGroup>
          </button>
        </div>
      </EuiPopover>
    </>
  );
};

export const testTrailingControlColumns = [
  {
    id: 'actions',
    width: 100,
    headerCellRender: <></>,
    rowCellRender: TestTrailingColumn,
  },
];

export const testLeadingControlColumn: ControlColumnProps = {
  id: 'test-leading-control',
  headerCellRender: SelectionHeaderCell,
  rowCellRender: SelectionRowCell,
  width: 200,
};

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
