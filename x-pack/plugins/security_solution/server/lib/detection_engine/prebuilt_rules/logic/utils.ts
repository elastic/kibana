/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddPrepackagedRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import type { RuleAlertType } from '../../rule_schema';

/**
 * Converts an array of prepackaged rules to a Map with rule IDs as keys
 *
 * @param rules Array of prepackaged rules
 * @returns Map
 */
export const prepackagedRulesToMap = (rules: AddPrepackagedRulesSchema[]) =>
  new Map(rules.map((rule) => [rule.rule_id, rule]));

/**
 * Converts an array of rules to a Map with rule IDs as keys
 *
 * @param rules Array of rules
 * @returns Map
 */
export const rulesToMap = (rules: RuleAlertType[]) =>
  new Map(rules.map((rule) => [rule.params.ruleId, rule]));
