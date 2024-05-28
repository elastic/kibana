/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleObjectId,
  RuleResponse,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { readRules } from '../../../../rule_management/logic/rule_management/read_rules';
import { transform } from '../../../../rule_management/utils/utils';

// TODO: https://github.com/elastic/kibana/issues/125642 Move to rule_management into a RuleManagementClient

export const fetchRuleById = async (
  rulesClient: RulesClient,
  id: RuleObjectId
): Promise<RuleResponse> => {
  const rawRule = await readRules({
    id,
    rulesClient,
    ruleId: undefined,
  });

  if (rawRule == null) {
    throw Boom.notFound(`Rule not found, id: "${id}" `);
  }

  const normalizedRule = transform(rawRule);

  if (normalizedRule == null) {
    throw Boom.internal('Internal error normalizing rule object');
  }

  return normalizedRule;
};
