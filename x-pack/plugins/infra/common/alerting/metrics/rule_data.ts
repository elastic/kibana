/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt } from '@kbn/io-ts-utils/target/json_rt';
import * as rt from 'io-ts';
import {
  baseAlertRequestParamsRT as inventoryMetricThresholdAlertParamsRT,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
} from './types';

export const serializedParamsKey = 'serialized_params';

export const inventoryMetricThresholdRuleDataNamespace = METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID;
export const inventoryMetricThresholdRuleDataSerializedParamsKey = `${inventoryMetricThresholdRuleDataNamespace}.${serializedParamsKey}` as const;

// TODO change name (threshold)
export const inventoryMetricRuleDataRT = rt.type({
  [inventoryMetricThresholdRuleDataSerializedParamsKey]: rt.array(
    jsonRt.pipe(inventoryMetricThresholdAlertParamsRT)
  ),
});
