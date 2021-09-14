/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

export function getApmIndexPatternTitle(apmIndicesConfig: ApmIndicesConfig) {
  return uniq([
    apmIndicesConfig['apm_oss.transactionIndices'],
    apmIndicesConfig['apm_oss.spanIndices'],
    apmIndicesConfig['apm_oss.errorIndices'],
    apmIndicesConfig['apm_oss.metricsIndices'],
  ]).join(',');
}
