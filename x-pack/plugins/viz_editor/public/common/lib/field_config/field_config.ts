/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceField, SelectOperator } from '../../../../common';

export function getOperationsForField(field: DatasourceField): SelectOperator[] {
  // TODO: Make this configuration plugin-oriented
  if (!field.aggregatable) {
    return ['column'];
  }

  if (field.type === 'date') {
    return ['date_histogram'];
  }

  if (field.type === 'number') {
    return ['terms', 'avg', 'sum'];
  }

  if (field.type === 'string') {
    return ['terms', 'count'];
  }

  return ['column'];
}
