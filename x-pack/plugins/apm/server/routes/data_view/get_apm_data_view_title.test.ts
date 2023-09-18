/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { getApmDataViewTitle } from './get_apm_data_view_title';

describe('getApmDataViewTitle', () => {
  it('returns a data view title by combining existing indicies', () => {
    const title = getApmDataViewTitle({
      transaction: 'apm-*-transaction-*',
      span: 'apm-*-span-*',
      error: 'apm-*-error-*',
      metric: 'apm-*-metrics-*',
    } as APMIndices);
    expect(title).toBe(
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*'
    );
  });

  it('removes duplicates', () => {
    const title = getApmDataViewTitle({
      transaction: 'apm-*',
      span: 'apm-*',
      error: 'apm-*',
      metric: 'apm-*',
    } as APMIndices);
    expect(title).toBe('apm-*');
  });
});
