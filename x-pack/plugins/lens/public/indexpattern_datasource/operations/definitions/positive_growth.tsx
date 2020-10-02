/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn, FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
import { updateColumnParam } from '../../state_helpers';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of records',
});

export type PositiveGrowthIndexPatternColumn = FormattedIndexPatternColumn &
  FieldBasedIndexPatternColumn & {
    operationType: 'positive_growth';
  };

export const positiveGrowthOperation: OperationDefinition<
  PositiveGrowthIndexPatternColumn,
  'field'
> = {
  type: 'positive_growth',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.positiveGrowth', {
    defaultMessage: 'Positive growth',
  }),
  input: 'field',
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.displayName,
      sourceField: field.name,
    };
  },
  getPossibleOperationForField: (field: IndexPatternField) => {
    if (field.type === 'number') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  buildColumn({ suggestedPriority, field, previousColumn }) {
    return {
      label: countLabel,
      dataType: 'number',
      operationType: 'positive_growth',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params
          ? previousColumn.params
          : undefined,
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'positive_growth',
    schema: 'metric',
    params: {
      field: column.sourceField,
      // customMetric: {
      //   type: 'derivative',
      //   params: {
      //     customMetric: {
      //       type: 'max',
      //       params: {
      //         field: column.sourceField,
      //       },
      //     },
      //   },
      // },
    },
  }),
  isTransferable: () => {
    return true;
  },
  paramEditor({ currentColumn, state, setState, layerId }) {
    const options = [
      {
        value: 'none',
        text: 'None',
      },
      {
        value: '1s',
        text: 'Per second',
      },
      {
        value: '1m',
        text: 'Per minute',
      },
      {
        value: '1h',
        text: 'Per hour',
      },
    ];
    return (
      <>
        <EuiFormRow label="Scale to time">
          <EuiSelect
            options={options}
            value={currentColumn?.params?.format?.params?.unit ?? null}
            onChange={(e) => {
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'format',
                  value:
                    e.target.value === 'none'
                      ? undefined
                      : {
                          id: 'scaled',
                          params: {
                            unit: e.target.value,
                          },
                        },
                })
              );
            }}
          />
        </EuiFormRow>
      </>
    );
  },
};
