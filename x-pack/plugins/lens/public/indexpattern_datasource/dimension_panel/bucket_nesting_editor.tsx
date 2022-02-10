/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiSelect } from '@elastic/eui';
import { IndexPatternLayer, IndexPatternField } from '../types';
import { hasField } from '../pure_utils';
import { GenericIndexPatternColumn } from '../operations';

function nestColumn(columnOrder: string[], outer: string, inner: string) {
  const result = columnOrder.filter((c) => c !== inner);
  const outerPosition = result.indexOf(outer);

  result.splice(outerPosition + 1, 0, inner);

  return result;
}

function getFieldName(
  column: GenericIndexPatternColumn,
  getFieldByName: (name: string) => IndexPatternField | undefined
) {
  return hasField(column)
    ? getFieldByName(column.sourceField)?.displayName || column.sourceField
    : '';
}

export function BucketNestingEditor({
  columnId,
  layer,
  setColumns,
  getFieldByName,
}: {
  columnId: string;
  layer: IndexPatternLayer;
  setColumns: (columns: string[]) => void;
  getFieldByName: (name: string) => IndexPatternField | undefined;
}) {
  const column = layer.columns[columnId];
  const columns = Object.entries(layer.columns);
  const aggColumns = columns
    .filter(([id, c]) => id !== columnId && c.isBucketed)
    .map(([value, c]) => ({
      value,
      text: c.label,
      fieldName: getFieldName(c, getFieldByName),
      operationType: c.operationType,
    }));

  if (!column || !column.isBucketed || !aggColumns.length) {
    return null;
  }

  const prevColumn = layer.columnOrder[layer.columnOrder.indexOf(columnId) - 1];

  if (aggColumns.length === 1) {
    const [target] = aggColumns;
    const useAsTopLevelAggCopy = i18n.translate('xpack.lens.indexPattern.useAsTopLevelAgg', {
      defaultMessage: 'Group by this field first',
    });
    return (
      <EuiFormRow label={useAsTopLevelAggCopy} display="columnCompressedSwitch">
        <EuiSwitch
          compressed
          label={useAsTopLevelAggCopy}
          showLabel={false}
          data-test-subj="indexPattern-nesting-switch"
          name="nestingSwitch"
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
    );
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.groupByDropdown', {
        defaultMessage: 'Group by',
      })}
      display="columnCompressed"
      fullWidth
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
  );
}
