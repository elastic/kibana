/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SelectOperator } from '../../../../common';
import { Field } from '../vis_model';

export function getOperationsForField(field: Field): SelectOperator[] {
  // TODO: Make this configuration plugin-oriented
  if (!field.aggregatable) {
    return ['column'];
  }

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
