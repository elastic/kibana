/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricExpression } from '../types';

export const generateUniqueKey = (criterion: MetricExpression) => {
  const metric = criterion.metric ? `(${criterion.metric})` : '';

  return criterion.aggType + metric + criterion.comparator + criterion.threshold.join(',');
};
