/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { IndexPatternField, ValueIndexPatternColumn } from '../indexpattern';
import { DataType, DimensionPriority } from '../../types';
import { OperationDefinition } from '.';

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.valueOf', {
    defaultMessage: 'Value of {name}',
    values: { name },
  });
}

export const valueOperation: OperationDefinition<ValueIndexPatternColumn> = {
  type: 'value',
  displayName: i18n.translate('xpack.lens.indexPattern.value', {
    defaultMessage: 'Value',
  }),
  isApplicableWithoutField: false,
  isApplicableForField: ({ aggregationRestrictions, type }) => {
    return !aggregationRestrictions;
  },
  buildColumn(
    operationId: string,
    suggestedOrder?: DimensionPriority,
    field?: IndexPatternField
  ): ValueIndexPatternColumn {
    if (!field) {
      throw new Error('Invariant: value operation is only valid on a field');
    }
    return {
      operationId,
      label: ofName(field ? field.name : ''),
      dataType: field.type as DataType,
      operationType: 'value',
      suggestedOrder,
      sourceField: field.name,
      isBucketed: false,
    };
  },
};
