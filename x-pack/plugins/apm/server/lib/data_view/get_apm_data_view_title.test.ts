/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import { getApmDataViewTitle } from './get_apm_data_view_title';

describe('getApmDataViewTitle', () => {
  it('returns an data view title by combining existing indicies', () => {
    const title = getApmDataViewTitle({
      'apm_oss.transactionIndices': 'apm-*-transaction-*',
      'apm_oss.spanIndices': 'apm-*-span-*',
      'apm_oss.errorIndices': 'apm-*-error-*',
      'apm_oss.metricsIndices': 'apm-*-metrics-*',
    } as ApmIndicesConfig);
    expect(title).toBe(
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*'
    );
  });

  it('removes duplicates', () => {
    const title = getApmDataViewTitle({
      'apm_oss.transactionIndices': 'apm-*',
      'apm_oss.spanIndices': 'apm-*',
      'apm_oss.errorIndices': 'apm-*',
      'apm_oss.metricsIndices': 'apm-*',
    } as ApmIndicesConfig);
    expect(title).toBe('apm-*');
  });
});
