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
  EuiFlexGroup,
  EuiSideNav,
  EuiComboBox,
  EuiCallOut,
} from '@elastic/eui';
import classNames from 'classnames';
import {
  IndexPatternColumn,
  FieldBasedIndexPatternColumn,
  IndexPatternPrivateState,
  OperationType,
} from '../indexpattern';
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
  const [invalidOperationType, setInvalidOperationType] = useState<OperationType | null>(null);
  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;
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

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: operations.map(op => ({
        name: operationPanels[op].displayName,
        id: op,
        className: classNames({
          'lnsConfigPanel__operation--unsupported':
            !invalidOperationType && !functionsFromField.some(col => col.operationType === op),
          'lnsConfigPanel__operation--selected': Boolean(
            invalidOperationType === op ||
              (!invalidOperationType && selectedColumn && selectedColumn.operationType === op)
          ),
        }),
        onClick() {
          if (!functionsFromField.some(col => col.operationType === op)) {
            setInvalidOperationType(op);
            return;
          }
          if (invalidOperationType) {
            setInvalidOperationType(null);
          }
          if (selectedColumn.operationType === op) {
            return;
          }
          const newColumn: IndexPatternColumn = filteredColumns.find(
            col =>
              col.operationType === op &&
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
        },
      })),
    },
  ];

  const fieldColumns = filteredColumns.filter(
    col => 'sourceField' in col
  ) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = _.uniq(fieldColumns, col => col.sourceField);

  uniqueColumnsByField.sort((column1, column2) => {
    return column1.sourceField.localeCompare(column2.sourceField);
  });

  const fieldOptions = uniqueColumnsByField.map(col => ({
    label: col.sourceField,
    value: col.operationId,
    disabled: invalidOperationType
      ? col.operationType !== invalidOperationType
      : selectedColumn && col.operationType !== selectedColumn.operationType,
  }));

  return selectedColumn ? (
    <EuiFlexItem grow={null}>
      <EuiPopover
        id={columnId}
        className="lnsConfigPanel__summaryPopover"
        anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
        button={
          <EuiFlexItem data-test-subj="indexPattern-dimension" grow={true}>
            <EuiButtonIcon
              data-test-subj="indexPattern-dimensionPopover-button"
              onClick={() => {
                setSettingsOpen(!isSettingsOpen);
              }}
              iconType="gear"
              aria-label={i18n.translate('xpack.lens.indexPattern.settingsLabel', {
                defaultMessage: 'Settings',
              })}
            />
          </EuiFlexItem>
        }
        isOpen={isSettingsOpen}
        closePopover={() => {
          setSettingsOpen(false);
        }}
        anchorPosition="leftUp"
        withTitle
        panelPaddingSize="s"
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem
            grow={!ParamEditor}
            className={`lnsConfigPanel__summaryPopoverLeft ${ParamEditor &&
              'lnsConfigPanel__summaryPopoverLeft--shaded'}`}
          >
            <EuiSideNav items={sideNavItems} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" direction="column">
              <EuiFlexItem>
                {'sourceField' in selectedColumn && (
                  <EuiComboBox
                    fullWidth
                    data-test-subj="indexPattern-popover-dimension-field"
                    placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
                      defaultMessage: 'Field',
                    })}
                    options={fieldOptions}
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
                      const column: IndexPatternColumn = filteredColumns.find(
                        ({ operationId }) => operationId === choices[0].value
                      )!;
                      const newColumns: IndexPatternPrivateState['columns'] = {
                        ...state.columns,
                        [columnId]: column,
                      };

                      if (invalidOperationType) {
                        setInvalidOperationType(null);
                      }

                      setState({
                        ...state,
                        columns: newColumns,
                        columnOrder: getColumnOrder(newColumns),
                      });
                    }}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                {invalidOperationType ? (
                  <EuiCallOut
                    title="Operation not applicable to field"
                    color="danger"
                    iconType="cross"
                  >
                    <p>Please choose another field</p>
                  </EuiCallOut>
                ) : (
                  ParamEditor && (
                    <ParamEditor state={state} setState={setState} columnId={columnId} />
                  )
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </EuiFlexItem>
  ) : null;
}
