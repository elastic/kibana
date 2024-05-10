/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator } from '../../../../../common/alerting/metrics';
import { createConditionScript } from './create_condition_script';

describe('createConditionScript', () => {
  it('should convert tx threshold from bits to byte', () => {
    expect(createConditionScript([8], Comparator.GT_OR_EQ, 'tx')).toEqual({
      params: {
        // Threshold has been converted from 8 bits to 1 byte
        threshold: 1,
      },
      source: 'params.value >= params.threshold ? 1 : 0',
    });
  });
});
