/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useState } from 'react';
import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { EuiFieldNumber } from '@elastic/eui';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import { checkForDateHistogram, dateBasedOperationToExpression, hasDateField } from './utils';
import { updateColumnParam } from '../../layer_helpers';
import { useDebounceWithOptions } from '../helpers';
import type { OperationDefinition, ParamEditorProps } from '..';

const ofName = (name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.movingAverageOf', {
    defaultMessage: 'Moving average of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
};

export type MovingAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'moving_average';
    params: {
      window: number;
    };
  };

export const movingAverageOperation: OperationDefinition<
  MovingAverageIndexPatternColumn,
  'fullReference'
> = {
  type: 'moving_average',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.movingAverage', {
    defaultMessage: 'Moving Average',
  }),
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field'],
      validateMetadata: (metadata) =>
        metadata.dataType === 'number' && metadata.isBucketed === false,
    },
  ],
  getPossibleOperation: () => {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    return ofName(columns[column.references[0]]?.label);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'moving_average', {
      window: [(layer.columns[columnId] as MovingAverageIndexPatternColumn).params.window],
    });
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric?.label),
      dataType: 'number',
      operationType: 'moving_average',
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format, window: 5 }
          : { window: 5 },
    };
  },
  paramEditor: MovingAverageParamEditor,
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: IndexPatternLayer) => {
    return checkForDateHistogram(layer);
  },
};

function MovingAverageParamEditor({
  state,
  setState,
  currentColumn,
  layerId,
}: ParamEditorProps<MovingAverageIndexPatternColumn>) {
  const [inputValue, setInputValue] = useState(String(currentColumn.params.window));

  useDebounceWithOptions(
    () => {
      if (inputValue === '') {
        return;
      }
      const inputNumber = Number(inputValue);
      setState(
        updateColumnParam({
          state,
          layerId,
          currentColumn,
          paramName: 'window',
          value: inputNumber,
        })
      );
    },
    { skipFirstRender: true },
    256,
    [inputValue]
  );
  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.movingAverage.window', {
        defaultMessage: 'Window size',
      })}
      display="columnCompressed"
      fullWidth
    >
      <EuiFieldNumber
        compressed
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
      />
    </EuiFormRow>
  );
}
