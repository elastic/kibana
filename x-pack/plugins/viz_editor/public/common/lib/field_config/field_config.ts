/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternField } from '..';
import { SelectOperator } from '../../../../common';

export function getOperationsForField(field: IndexPatternField): SelectOperator[] {
  // TODO: Make this configuration plugin-oriented
  if (field.type === 'date') {
    return ['date_histogram'];
  }
  if (field.type === 'number') {
    return ['count', 'avg', 'sum'];
  }
  if (field.type === 'string') {
    return ['terms'];
  }
  return ['count'];
}
