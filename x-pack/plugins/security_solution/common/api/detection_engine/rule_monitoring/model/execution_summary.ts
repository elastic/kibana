/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';
import { RuleExecutionMetrics } from './execution_metrics';
import { TRuleExecutionStatus } from './execution_status';

export type RuleExecutionSummary = t.TypeOf<typeof RuleExecutionSummary>;
export const RuleExecutionSummary = t.type({
  last_execution: t.type({
    date: IsoDateString,
    status: TRuleExecutionStatus,
    status_order: t.number,
    message: t.string,
    metrics: RuleExecutionMetrics,
  }),
});
