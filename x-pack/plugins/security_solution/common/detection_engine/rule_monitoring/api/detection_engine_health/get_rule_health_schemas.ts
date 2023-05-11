/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';

import type { RuleResponse } from '../../../rule_schema';
import { RuleObjectId } from '../../../rule_schema';

import type { HealthInterval } from '../../model/detection_engine_health/health_interval';
import { HealthIntervalParameters } from '../../model/detection_engine_health/health_interval';
import type { HealthResponseMetadata } from '../../model/detection_engine_health/health_response_metadata';
import type { StatsHistory } from '../../model/execution_stats/stats_history';
import type { RuleExecutionStats } from '../../model/execution_stats/stats';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

export type GetRuleHealthRequestBody = t.TypeOf<typeof GetRuleHealthRequestBody>;
export const GetRuleHealthRequestBody = t.exact(
  t.intersection([
    t.type({
      rule_id: RuleObjectId,
    }),
    t.partial({
      interval: HealthIntervalParameters,
    }),
  ])
);

export interface GetRuleHealthRequest {
  ruleId: RuleObjectId;
  interval: HealthInterval;
  requestReceivedAt: IsoDateString;
}

export interface GetRuleHealthResponse {
  meta: HealthResponseMetadata;
  rule: RuleResponse;
  stats: RuleExecutionStats;
  stats_history: StatsHistory<RuleExecutionStats>;
  debug?: unknown;
}
