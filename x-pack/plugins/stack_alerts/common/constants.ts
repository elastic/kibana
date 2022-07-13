/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';

export const ALERTING_EXAMPLE_APP_ID = 'AlertingExample';

// always firing
export const DEFAULT_INSTANCES_TO_GENERATE = 5;
export interface AlwaysFiringThresholds {
  small?: number;
  medium?: number;
  large?: number;
}
export interface AlwaysFiringParams extends RuleTypeParams {
  instances?: number;
  thresholds?: AlwaysFiringThresholds;
  shouldFlapp?: boolean;
  shouldPersist?: boolean;
}
export type AlwaysFiringActionGroupIds = keyof AlwaysFiringThresholds;
