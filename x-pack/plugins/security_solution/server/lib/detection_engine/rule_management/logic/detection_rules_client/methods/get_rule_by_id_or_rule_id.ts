/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleObjectId,
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../../common/utils/invariant';
import { getRuleById } from './get_rule_by_id';
import { getRuleByRuleId } from './get_rule_by_rule_id';

interface GetRuleByIdOptions {
  rulesClient: RulesClient;
  id: RuleObjectId | undefined;
  ruleId: RuleSignatureId | undefined;
}

export const getRuleByIdOrRuleId = async ({
  rulesClient,
  id,
  ruleId,
}: GetRuleByIdOptions): Promise<RuleResponse | null> => {
  if (id != null) {
    return getRuleById({ rulesClient, id });
  }
  if (ruleId != null) {
    return getRuleByRuleId({ rulesClient, ruleId });
  }
  invariant(false, 'Either id or ruleId must be provided');
};
