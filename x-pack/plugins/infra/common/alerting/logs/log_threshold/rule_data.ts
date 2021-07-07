/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt } from '@kbn/io-ts-utils/target/json_rt';
import * as rt from 'io-ts';
import { alertParamsRT as logThresholdAlertParamsRT } from './types';

export const serializedParamsKey = 'serialized_params';

export const logThresholdRuleDataNamespace = 'log_threshold_rule';
export const logThresholdRuleDataSerializedParamsKey = `${logThresholdRuleDataNamespace}.${serializedParamsKey}` as const;

export const logThresholdRuleDataRT = rt.type({
  [logThresholdRuleDataSerializedParamsKey]: rt.array(jsonRt.pipe(logThresholdAlertParamsRT)),
});
