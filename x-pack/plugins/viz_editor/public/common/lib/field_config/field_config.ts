/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceField, SelectOperator } from '../../../../common';

export function getOperatorsForField(
  field: DatasourceField,
  includeMetric: boolean = true,
  includeSegment: boolean = true
): SelectOperator[] {
  const operators: SelectOperator[] = [];
  // TODO: Make this configuration plugin-oriented
  if (field.aggregatable) {
    if (field.type === 'date' && includeSegment) {
      operators.push('date_histogram');
    }

    if (field.type === 'number') {
      if (includeMetric) {
        operators.push('sum');
        operators.push('avg');
      }
      if (includeSegment) {
        operators.push('terms');
      }
    }

    if (field.type === 'string' && includeSegment) {
      operators.push('terms');
    }

    if (field.type === 'boolean' && includeSegment) {
      operators.push('terms');
    }
  }

  if (includeMetric && includeSegment) {
    operators.push('column');
  }

  return operators;
}
