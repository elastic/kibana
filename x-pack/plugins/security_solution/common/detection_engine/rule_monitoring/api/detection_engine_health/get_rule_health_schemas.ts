/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';

import { RuleObjectId } from '../../../rule_schema';

import type { HealthInterval } from '../../model/detection_engine_health/health_interval';
import { HealthIntervalParameters } from '../../model/detection_engine_health/health_interval';
import type { HealthTimings } from '../../model/detection_engine_health/health_metadata';
import type {
  RuleHealthParameters,
  RuleHealthSnapshot,
} from '../../model/detection_engine_health/rule_health';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

export type GetRuleHealthRequestBody = t.TypeOf<typeof GetRuleHealthRequestBody>;
export const GetRuleHealthRequestBody = t.exact(
  t.intersection([
    t.type({
      rule_id: RuleObjectId,
    }),
    t.partial({
      interval: HealthIntervalParameters,
      debug: t.boolean,
    }),
  ])
);

export interface GetRuleHealthRequest {
  ruleId: RuleObjectId;
  interval: HealthInterval;
  debug: boolean;
  requestReceivedAt: IsoDateString;
}

export interface GetRuleHealthResponse {
  timings: HealthTimings;
  parameters: RuleHealthParameters;
  health: RuleHealthSnapshot;
}
