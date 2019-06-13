/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
} from '@elastic/eui';
import { IndexPatternColumn } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import {
  getColumnOrder,
  operationDefinitionMap,
  getOperations,
  getOperationDisplay,
} from '../operations';

export interface SettingsProps extends IndexPatternDimensionPanelProps {
  selectedColumn: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function Settings({
  selectedColumn,
  filteredColumns,
  state,
  columnId,
  setState,
}: SettingsProps) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const contextOptionBuilder =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].contextMenu;
  const contextOptions = contextOptionBuilder
    ? contextOptionBuilder({
        state,
        setState,
        columnId,
      })
    : [];
  const operations = getOperations();
  const operationPanels = getOperationDisplay();
  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return (
          (!('sourceField' in selectedColumn) && !('sourceField' in col)) ||
          ('sourceField' in selectedColumn &&
            'sourceField' in col &&
            col.sourceField === selectedColumn.sourceField)
        );
      })
    : filteredColumns;

  const operationMenuItems = operations
    .filter(o => selectedColumn && functionsFromField.some(col => col.operationType === o))
    .map(o => (
      <EuiContextMenuItem
        data-test-subj={`lns-indexPatternDimension-${o}`}
        key={o}
        icon={selectedColumn && selectedColumn.operationType === o ? 'check' : 'empty'}
        onClick={() => {
          const newColumn: IndexPatternColumn = filteredColumns.find(
            col =>
              col.operationType === o &&
              (!('sourceField' in col) ||
                !('sourceField' in selectedColumn) ||
                col.sourceField === selectedColumn.sourceField)
          )!;

          const newColumns = {
            ...state.columns,
            [columnId]: newColumn,
          };

          setState({
            ...state,
            columnOrder: getColumnOrder(newColumns),
            columns: newColumns,
          });
        }}
      >
        {operationPanels[o].displayName}
      </EuiContextMenuItem>
    ));

  return selectedColumn && (operationMenuItems.length > 1 || contextOptions.length > 0) ? (
    <EuiFlexItem grow={null}>
      <EuiPopover
        id={columnId}
        panelClassName="lnsIndexPattern__dimensionPopover"
        isOpen={isSettingsOpen}
        closePopover={() => {
          setSettingsOpen(false);
        }}
        ownFocus
        anchorPosition="leftCenter"
        panelPaddingSize="none"
        button={
          <EuiFlexItem data-test-subj="indexPattern-dimension" grow={true}>
            <EuiButtonIcon
              data-test-subj="indexPattern-dimensionPopover-button"
              onClick={() => {
                setSettingsOpen(!isSettingsOpen);
              }}
              iconType="gear"
              aria-label="Settings"
            />
          </EuiFlexItem>
        }
      >
        <EuiContextMenuPanel>{operationMenuItems.concat(contextOptions)}</EuiContextMenuPanel>
      </EuiPopover>
    </EuiFlexItem>
  ) : null;
}
