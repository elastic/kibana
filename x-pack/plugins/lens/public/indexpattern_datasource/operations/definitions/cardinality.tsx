/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

const SCALE = 'ratio';
const OPERATION_TYPE = 'cardinality';
const IS_BUCKETED = false;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
    defaultMessage: 'Unique count of {name}',
    values: { name },
  });
}

export interface CardinalityIndexPatternColumn extends FormattedIndexPatternColumn {
  operationType: 'cardinality';
}

export const cardinalityOperation: OperationDefinition<CardinalityIndexPatternColumn> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.cardinality', {
    defaultMessage: 'Unique count',
  }),
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.cardinality)
    ) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find((field) => field.name === column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  buildColumn({ suggestedPriority, field, previousColumn }) {
    return {
      label: ofName(field.name),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      suggestedPriority,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      params:
        previousColumn && previousColumn.dataType === 'number' ? previousColumn.params : undefined,
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: OPERATION_TYPE,
    schema: 'metric',
    params: {
      field: column.sourceField,
      missing: 0,
    },
  }),
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: ofName(field.name),
      sourceField: field.name,
    };
  },
};
