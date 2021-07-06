/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { alertParamsRT as logThresholdAlertParamsRT } from './types';

export const logThresholdRuleDataNamespace = 'log_threshold_rule';

export const logThresholdRuleDataRT = rt.type({
  [logThresholdRuleDataNamespace]: rt.array(
    rt.type({
      params: logThresholdAlertParamsRT,
    })
  ),
});
