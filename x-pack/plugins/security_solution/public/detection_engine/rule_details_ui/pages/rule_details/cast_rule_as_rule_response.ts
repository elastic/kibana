/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '../../../rule_management/logic';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';

/*
 * This is a temporary workaround to suppress TS errors when using
 * rule section components on the rule details page.
 *
 * The rule details page passes a Rule object to the rule section components,
 * but section components expect a RuleResponse object. Rule and RuleResponse
 * are basically same object type with only a few minor differences.
 * This function casts the Rule object to RuleResponse.
 *
 * In the near future we'll start using codegen to generate proper response
 * types and the rule details page will start passing RuleResponse objects,
 * so this workaround will no longer be needed.
 */
export const castRuleAsRuleResponse = (rule: Rule) => rule as Partial<RuleResponse>;
