/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../../../common/constants';
import { SLO } from '../../../../domain/models';
import { BurnRateRuleParams } from '../types';

export function createBurnRateRule(slo: SLO, params: Partial<BurnRateRuleParams> = {}) {
  return {
    sloId: slo.id,
    windows: [
      {
        id: v4(),
        burnRateThreshold: 14.4,
        maxBurnRateThreshold: null,
        longWindow: { value: 1, unit: 'h' },
        shortWindow: { value: 5, unit: 'm' },
        actionGroup: ALERT_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 6,
        maxBurnRateThreshold: null,
        longWindow: { value: 6, unit: 'h' },
        shortWindow: { value: 30, unit: 'm' },
        actionGroup: HIGH_PRIORITY_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 3,
        maxBurnRateThreshold: null,
        longWindow: { value: 24, unit: 'h' },
        shortWindow: { value: 120, unit: 'm' },
        actionGroup: MEDIUM_PRIORITY_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 1,
        maxBurnRateThreshold: null,
        longWindow: { value: 72, unit: 'h' },
        shortWindow: { value: 360, unit: 'm' },
        actionGroup: LOW_PRIORITY_ACTION.id,
      },
    ],
    ...params,
  };
}
