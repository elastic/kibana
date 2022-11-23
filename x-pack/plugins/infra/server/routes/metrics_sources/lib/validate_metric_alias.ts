/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidMetricIndicesError } from '../../../lib/sources/errors';

export function assertMetricAlias(metricAlias?: string) {
  const isValidMetricAlias = validateMetricAlias(metricAlias);

  if (!isValidMetricAlias) {
    throw new InvalidMetricIndicesError(
      'The metric indices value contains invalid characters (empty values, spaces).'
    );
  }
}

export function validateMetricAlias(metricAlias?: string) {
  if (metricAlias === undefined) return true;

  return !containEmptyValue(metricAlias) && !containSpaces(metricAlias);
}

function containEmptyValue(value: string) {
  return value.includes(',,');
}

function containSpaces(value: string) {
  return value.includes(' ');
}
