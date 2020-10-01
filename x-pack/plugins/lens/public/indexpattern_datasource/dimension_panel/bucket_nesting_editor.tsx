/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiHorizontalRule, EuiSwitch, EuiSelect } from '@elastic/eui';
import { IndexPatternLayer, IndexPatternField } from '../types';
import { hasField } from '../utils';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';

function nestColumn(columnOrder: string[], outer: string, inner: string) {
  const result = columnOrder.filter((c) => c !== inner);
  const outerPosition = result.indexOf(outer);

  result.splice(outerPosition + 1, 0, inner);

  return result;
}

function getFieldName(fieldMap: Record<string, IndexPatternField>, column: IndexPatternColumn) {
  return hasField(column) ? fieldMap[column.sourceField]?.displayName || column.sourceField : '';
}

export function BucketNestingEditor({
  columnId,
  layer,
  setColumns,
  fieldMap,
  columnLabelMap,
}: {
  columnId: string;
  layer: IndexPatternLayer;
  setColumns: (columns: string[]) => void;
  fieldMap: Record<string, IndexPatternField>;
  columnLabelMap: Record<string, string>;
}) {
  const column = layer.columns[columnId];
  const columns = Object.entries(layer.columns);
  const aggColumns = columns
    .filter(([id, c]) => id !== columnId && c.isBucketed)
    .map(([value, c]) => ({
      value,
      text: c.label,
      fieldName: getFieldName(fieldMap, c),
      operationType: c.operationType,
    }));

  if (!column || !column.isBucketed || !aggColumns.length) {
    return null;
  }

  const prevColumn = layer.columnOrder[layer.columnOrder.indexOf(columnId) - 1];

  if (aggColumns.length === 1) {
    const [target] = aggColumns;
    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('xpack.lens.indexPattern.useAsTopLevelAgg', {
              defaultMessage: 'Use as top level aggregation',
            })}
            checked={!prevColumn}
            onChange={() => {
              if (prevColumn) {
                setColumns(nestColumn(layer.columnOrder, columnId, target.value));
              } else {
                setColumns(nestColumn(layer.columnOrder, target.value, columnId));
              }
            }}
          />
        </EuiFormRow>
      </>
    );
  }

  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.groupByDropdown', {
          defaultMessage: 'Group by',
        })}
        display="rowCompressed"
      >
        <EuiSelect
          compressed
          data-test-subj="indexPattern-nesting-select"
          options={[
            {
              value: '',
              text: i18n.translate('xpack.lens.xyChart.nestUnderRoot', {
                defaultMessage: 'Entire data set',
              }),
            },
            ...aggColumns.map(({ value, text }) => ({ value, text })),
          ]}
          value={prevColumn}
          onChange={(e) => setColumns(nestColumn(layer.columnOrder, e.target.value, columnId))}
        />
      </EuiFormRow>
    </>
  );
}
