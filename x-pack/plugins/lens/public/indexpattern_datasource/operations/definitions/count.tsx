/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AggFunctionsMapping } from '../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn, FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
import { getInvalidFieldMessage } from './helpers';
import {
  adjustTimeScaleLabelSuffix,
  adjustTimeScaleOnOtherColumnChange,
} from '../time_scale_utils';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of records',
});

export type CountIndexPatternColumn = FormattedIndexPatternColumn &
  FieldBasedIndexPatternColumn & {
    operationType: 'count';
  };

export const countOperation: OperationDefinition<CountIndexPatternColumn, 'field'> = {
  type: 'count',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Count',
  }),
  input: 'field',
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: adjustTimeScaleLabelSuffix(field.displayName, undefined, oldColumn.timeScale),
      sourceField: field.name,
    };
  },
  getPossibleOperationForField: (field: IndexPatternField) => {
    if (field.type === 'document') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column) => adjustTimeScaleLabelSuffix(countLabel, undefined, column.timeScale),
  buildColumn({ field, previousColumn }) {
    return {
      label: adjustTimeScaleLabelSuffix(countLabel, undefined, previousColumn?.timeScale),
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      timeScale: previousColumn?.timeScale,
      filter: previousColumn?.filter,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format }
          : undefined,
    };
  },
  onOtherColumnChanged: (layer, thisColumnId, changedColumnId) =>
    adjustTimeScaleOnOtherColumnChange<CountIndexPatternColumn>(
      layer,
      thisColumnId,
      changedColumnId
    ),
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCount']>('aggCount', {
      id: columnId,
      enabled: true,
      schema: 'metric',
    }).toAst();
  },
  isTransferable: () => {
    return true;
  },
  timeScalingMode: 'optional',
  filterable: true,
};
