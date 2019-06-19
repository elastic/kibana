/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiButtonEmpty, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import { IndexPatternColumn, FieldBasedIndexPatternColumn } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { changeColumn, deleteColumn, hasField, sortByField } from '../state_helpers';

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
  const fieldColumns = filteredColumns.filter(hasField) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = sortByField(
    _.uniq(
      fieldColumns
        .filter(col => selectedColumn && col.operationType === selectedColumn.operationType)
        .concat(fieldColumns),
      col => col.sourceField
    )
  );

  const fieldOptions = [];
  const fieldLessColumn = filteredColumns.find(column => !hasField(column));
  if (fieldLessColumn) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.documentField', {
        defaultMessage: 'Document',
      }),
      value: fieldLessColumn.operationId,
    });
  }

  if (uniqueColumnsByField.length > 0) {
    fieldOptions.push({
      label: i18n.translate('xpack.lens.indexPattern.individualFieldsLabel', {
        defaultMessage: 'Individual fields',
      }),
      options: uniqueColumnsByField.map(col => ({
        label: col.sourceField,
        value: col.operationId,
      })),
    });
  }

  return (
    <>
      <EuiFlexItem grow={true}>
        {!isFieldSelectOpen ? (
          <EuiButtonEmpty
            data-test-subj="indexPattern-configure-dimension"
            onClick={() => setFieldSelectOpen(true)}
          >
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
            placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
              defaultMessage: 'Field',
            })}
            options={fieldOptions}
            selectedOptions={
              selectedColumn && hasField(selectedColumn)
                ? [
                    {
                      label: selectedColumn.sourceField,
                      value: selectedColumn.operationId,
                    },
                  ]
                : []
            }
            singleSelection={{ asPlainText: true }}
            isClearable={true}
            onChange={choices => {
              setFieldSelectOpen(false);

              if (choices.length === 0) {
                setState(deleteColumn(state, columnId));
                return;
              }

              const column: IndexPatternColumn = filteredColumns.find(
                ({ operationId }) => operationId === choices[0].value
              )!;

              setState(changeColumn(state, columnId, column));
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
            aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
              defaultMessage: 'Remove',
            })}
            onClick={() => {
              setState(deleteColumn(state, columnId));
            }}
          />
        </EuiFlexItem>
      )}
    </>
  );
}
