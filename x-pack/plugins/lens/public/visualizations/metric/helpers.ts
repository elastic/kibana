/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourcePublicAPI } from '../../types';

/**
 * Infer the numeric type of a metric column purely on the configuration
 */
export function isMetricNumericType(
  datasource: DatasourcePublicAPI | undefined,
  accessor: string | undefined
) {
  // No accessor means it's not a numeric type by default
  if (!accessor || !datasource) {
    return false;
  }
  const operation = datasource.getOperationForColumnId(accessor);
  const isNumericTypeFromOperation = Boolean(
    operation?.dataType === 'number' && !operation.hasArraySupport
  );
  return isNumericTypeFromOperation;
}
