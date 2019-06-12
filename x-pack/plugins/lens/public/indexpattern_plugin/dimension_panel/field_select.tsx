/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiButtonEmpty, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import {
  IndexPatternColumn,
  FieldBasedIndexPatternColumn,
  IndexPatternPrivateState,
} from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { getColumnOrder } from '../operations';

export interface FieldSelectProps extends IndexPatternDimensionPanelProps {
  selectedColumn: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function FieldSelect({
  selectedColumn,
  filteredColumns,
  state,
  columnId,
  setState,
}: FieldSelectProps) {
  const [isFieldSelectOpen, setFieldSelectOpen] = useState(false);
  const fieldColumns = filteredColumns.filter(
    col => 'sourceField' in col
  ) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = _.uniq(
    fieldColumns
      .filter(col => selectedColumn && col.operationType === selectedColumn.operationType)
      .concat(fieldColumns),
    col => col.sourceField
  );
  return (
    <>
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
                value: filteredColumns.find(column => !('sourceField' in column))!.operationId,
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
              const column: IndexPatternColumn = filteredColumns.find(
                ({ operationId }) => operationId === choices[0].value
              )!;
              const newColumns: IndexPatternPrivateState['columns'] = {
                ...state.columns,
                [columnId]: column,
              };

              setFieldSelectOpen(false);
              setState({
                ...state,
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
                ...state.columns,
              };
              delete newColumns[columnId];

              setState({
                ...state,
                columns: newColumns,
                columnOrder: getColumnOrder(newColumns),
              });
            }}
          />
        </EuiFlexItem>
      )}
    </>
  );
}
