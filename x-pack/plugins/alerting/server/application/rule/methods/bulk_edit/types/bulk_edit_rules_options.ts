/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { KueryNode } from '@kbn/es-query';
import {
  bulkEditRuleSnoozeScheduleSchema,
  bulkEditOperationsSchema,
  bulkEditOperationSchema,
} from '../schemas';
import { RuleParams, RuleDomain } from '../../../types';
import { Rule } from '../../../../../../common';

export type BulkEditRuleSnoozeSchedule = TypeOf<typeof bulkEditRuleSnoozeScheduleSchema>;
export type BulkEditOperation = TypeOf<typeof bulkEditOperationSchema>;
export type BulkEditOperations = TypeOf<typeof bulkEditOperationsSchema>;

export type ParamsModifier<Params extends RuleParams> = (
  rule: Rule<Params>
) => Promise<ParamsModifierResult<Params>>;

interface ParamsModifierResult<Params extends RuleParams> {
  modifiedParams: Params;
  isParamsUpdateSkipped: boolean;
}

export type ShouldIncrementRevision<Params extends RuleParams> = (params?: Params) => boolean;

export type BulkEditFields = keyof Pick<
  RuleDomain,
  'actions' | 'tags' | 'schedule' | 'throttle' | 'notifyWhen' | 'snoozeSchedule' | 'apiKey'
>;

export interface BulkEditOptionsCommon<Params extends RuleParams> {
  operations: BulkEditOperation[];
  paramsModifier?: ParamsModifier<Params>;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}

export type BulkEditOptionsFilter<Params extends RuleParams> = BulkEditOptionsCommon<Params> & {
  filter?: string | KueryNode;
};

export type BulkEditOptionsIds<Params extends RuleParams> = BulkEditOptionsCommon<Params> & {
  ids?: string[];
};

export type BulkEditSkipReason = 'RULE_NOT_MODIFIED';

export interface BulkActionSkipResult {
  id: Rule['id'];
  name?: Rule['name'];
  skip_reason: BulkEditSkipReason;
}

export interface BulkOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}
