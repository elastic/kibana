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

import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
} from './helpers';

const supportedTypes = new Set([
  'string',
  'boolean',
  'number',
  'number_range',
  'ip',
  'ip_range',
  'date',
  'date_range',
]);

const SCALE = 'ratio';
const OPERATION_TYPE = 'unique_count';
const IS_BUCKETED = false;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
    defaultMessage: 'Unique count of {name}',
    values: {
      name,
    },
  });
}

export interface CardinalityIndexPatternColumn
  extends FormattedIndexPatternColumn,
    FieldBasedIndexPatternColumn {
  operationType: typeof OPERATION_TYPE;
}

export const cardinalityOperation: OperationDefinition<CardinalityIndexPatternColumn, 'field'> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.cardinality', {
    defaultMessage: 'Unique count',
  }),
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.cardinality)
    ) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  filterable: true,

  operationParams: [
    { name: 'kql', type: 'string', required: false },
    { name: 'lucene', type: 'string', required: false },
  ],
  getDefaultLabel: (column, indexPattern) => ofName(getSafeName(column.sourceField, indexPattern)),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: ofName(field.displayName),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      filter: getFilter(previousColumn, columnParams),
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCardinality']>('aggCardinality', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
    }).toAst();
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName),
      sourceField: field.name,
    };
  },
};
