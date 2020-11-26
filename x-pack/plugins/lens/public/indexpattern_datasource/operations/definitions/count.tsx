/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn, FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
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
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format }
          : undefined,
    };
  },
  onOtherColumnChanged: adjustTimeScaleOnOtherColumnChange,
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'count',
    schema: 'metric',
    params: {},
  }),
  isTransferable: () => {
    return true;
  },
  timeScalingMode: 'optional',
};
