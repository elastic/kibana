/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatrixHistogramType } from '../../../../../common/search_strategy';
import { getGenericData } from './helpers';
import { stackedByBooleanField, stackedByTextField, result, textResult } from './mock_data';

describe('getGenericData', () => {
  test('stack by a boolean field', () => {
    const res = getGenericData<MatrixHistogramType.events>(stackedByBooleanField, 'events.bucket');
    expect(res).toEqual(result);
  });

  test('stack by a text field', () => {
    const res = getGenericData<MatrixHistogramType.events>(stackedByTextField, 'events.bucket');
    expect(res).toEqual(textResult);
  });
});
