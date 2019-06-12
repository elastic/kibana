/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiPopover,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiContextMenuItem,
  EuiContextMenuPanel,
} from '@elastic/eui';
import { DatasourceDimensionPanelProps } from '../types';
import {
  IndexPatternColumn,
  IndexPatternPrivateState,
  columnToOperation,
  FieldBasedIndexPatternColumn,
} from './indexpattern';

import {
  getOperationDisplay,
  getOperations,
  getPotentialColumns,
  getColumnOrder,
  operationDefinitionMap,
} from './operations';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isFieldSelectOpen, setFieldSelectOpen] = useState(false);

  const operations = getOperations();
  const operationPanels = getOperationDisplay();

  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const fieldColumns = filteredColumns.filter(
    col => 'sourceField' in col
  ) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = _.uniq(
    fieldColumns
      .filter(col => selectedColumn && col.operationType === selectedColumn.operationType)
      .concat(fieldColumns),
    col => col.sourceField
  );

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

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].inlineOptions;
  const contextOptionBuilder =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].contextMenu;

  const contextOptions = contextOptionBuilder
    ? contextOptionBuilder({
        state: props.state,
        setState: props.setState,
        columnId: props.columnId,
      })
    : [];

  const operationMenuItems = operations
    .filter(o => selectedColumn && functionsFromField.some(col => col.operationType === o))
    .map(o => (
      <EuiContextMenuItem
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
            ...props.state.columns,
            [props.columnId]: newColumn,
          };

          props.setState({
            ...props.state,
            columnOrder: getColumnOrder(newColumns),
            columns: newColumns,
          });
        }}
      >
        {operationPanels[o].displayName}
      </EuiContextMenuItem>
    ));

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={null}>
        <EuiFlexGroup alignItems="center">
          {!isFieldSelectOpen &&
            selectedColumn &&
            (operationMenuItems.length > 1 || contextOptions.length > 0) && (
              <EuiFlexItem grow={null}>
                <EuiPopover
                  id={props.columnId}
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
                  <EuiContextMenuPanel>
                    {operationMenuItems.concat(contextOptions)}
                  </EuiContextMenuPanel>
                </EuiPopover>
              </EuiFlexItem>
            )}
          <EuiFlexItem grow={true}>
            {!isFieldSelectOpen ? (
              <EuiButtonEmpty onClick={() => setFieldSelectOpen(true)}>
                {selectedColumn
                  ? selectedColumn.label
                  : i18n.translate('xpack.lens.indexPattern.configureDimensionLabel', {
                      defaultMessage: 'Configure dimension',
                    })}
              </EuiButtonEmpty>
            ) : (
              <EuiComboBox
                fullWidth
                inputRef={el => {
                  if (el) {
                    el.focus();
                  }
                }}
                onBlur={() => {
                  setFieldSelectOpen(false);
                }}
                data-test-subj="indexPattern-dimension-field"
                placeholder="Field"
                options={[
                  {
                    label: 'Document',
                    value: columns.find(column => !('sourceField' in column))!.operationId,
                  },
                  {
                    label: 'Individual fields',
                    options: uniqueColumnsByField.map(col => ({
                      label: col.sourceField,
                      value: col.operationId,
                    })),
                  },
                ]}
                selectedOptions={
                  selectedColumn && 'sourceField' in selectedColumn
                    ? [
                        {
                          label: selectedColumn.sourceField,
                          value: selectedColumn.operationId,
                        },
                      ]
                    : []
                }
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                onChange={choices => {
                  const column: IndexPatternColumn = columns.find(
                    ({ operationId }) => operationId === choices[0].value
                  )!;
                  const newColumns: IndexPatternPrivateState['columns'] = {
                    ...props.state.columns,
                    [props.columnId]: column,
                  };

                  setFieldSelectOpen(false);
                  props.setState({
                    ...props.state,
                    columns: newColumns,
                    columnOrder: getColumnOrder(newColumns),
                  });
                }}
              />
            )}
          </EuiFlexItem>
          {selectedColumn && (
            <EuiFlexItem>
              <EuiButtonIcon
                data-test-subj="indexPattern-dimensionPopover-remove"
                iconType="cross"
                iconSize="s"
                color="danger"
                aria-label="Remove"
                onClick={() => {
                  const newColumns: IndexPatternPrivateState['columns'] = {
                    ...props.state.columns,
                  };
                  delete newColumns[props.columnId];

                  props.setState({
                    ...props.state,
                    columns: newColumns,
                    columnOrder: getColumnOrder(newColumns),
                  });
                }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {ParamEditor && (
        <EuiFlexItem grow={2}>
          <ParamEditor state={props.state} setState={props.setState} columnId={props.columnId} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
