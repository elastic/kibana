/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';

export function getApmDataViewIndexPattern(apmIndices: APMIndices): string {
  return uniq([
    ...apmIndices.transaction.split(','),
    ...apmIndices.span.split(','),
    ...apmIndices.error.split(','),
    ...apmIndices.metric.split(','),
  ])
    .sort()
    .join(',');
}
