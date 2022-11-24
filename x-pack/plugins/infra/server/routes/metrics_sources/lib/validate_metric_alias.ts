/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateIndexPattern } from '../../../../common/source_configuration/validate_index_pattern';
import { InvalidMetricIndicesError } from '../../../lib/sources/errors';

export function assertMetricAlias(metricAlias?: string) {
  const isValidMetricAlias = validateIndexPattern(metricAlias);

  if (!isValidMetricAlias) {
    throw new InvalidMetricIndicesError(
      'The metric indices value contains invalid characters (empty values, spaces).'
    );
  }
}
