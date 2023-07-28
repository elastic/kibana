/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType } from '@kbn/config-schema';
import type {
  RuleActionParams as GenericRuleActionParams,
  RuleTypeParams,
  SanitizedRule,
} from '../../common';
import { CombinedSummarizedAlerts } from '../types';

type ActionTypeParams = Record<string, unknown>;

type Rule<RuleParams extends RuleTypeParams = RuleTypeParams> = Pick<
  SanitizedRule<RuleParams>,
  'id' | 'name' | 'tags'
>;

interface BuildActionParamsArgs<
  RuleParams extends RuleTypeParams = RuleTypeParams,
  RuleActionParams extends GenericRuleActionParams = GenericRuleActionParams
> {
  alerts: CombinedSummarizedAlerts;
  rule: Rule<RuleParams>;
  params: RuleActionParams;
  spaceId: string;
  ruleUrl?: string;
}

export interface ConnectorAdapter {
  connectorTypeId: string;
  /**
   * The schema of the action persisted
   * in the rule. The schema will be validated
   * when a rule is created or updated.
   * The schema should be backwards compatible
   * and should never introduce any breaking
   * changes.
   */
  ruleActionParamsSchema: ObjectType;
  buildActionParams: <
    RuleParams extends RuleTypeParams = RuleTypeParams,
    RuleActionParams extends GenericRuleActionParams = GenericRuleActionParams,
    ActionParams extends ActionTypeParams = ActionTypeParams
  >(
    args: BuildActionParamsArgs<RuleParams, RuleActionParams>
  ) => ActionParams;
}
