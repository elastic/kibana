/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleUpdateProps } from '../../../../../../common/api/detection_engine';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { RuleAlertType } from '../../../rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { getIdError } from '../../utils/utils';
import { convertUpdateAPIToInternalSchema } from '../../normalization/rule_converters';

import { validateMlAuth, ClientError, toggleRuleEnabledOnUpdate } from './utils';

import { readRules } from './read_rules';

export interface UpdateRuleProps {
  ruleUpdate: RuleUpdateProps;
}

export const updateRule = async (
  rulesClient: RulesClient,
  updateRulePayload: UpdateRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> =>
  withSecuritySpan('DetectionRulesClient.updateRule', async () => {
    const { ruleUpdate } = updateRulePayload;
    const { rule_id: ruleId, id } = ruleUpdate;

    await validateMlAuth(mlAuthz, ruleUpdate.type);

    const existingRule = await readRules({
      rulesClient,
      ruleId,
      id,
    });

    if (existingRule == null) {
      const error = getIdError({ id, ruleId });
      throw new ClientError(error.message, error.statusCode);
    }

    const newInternalRule = convertUpdateAPIToInternalSchema({
      existingRule,
      ruleUpdate,
    });

    const update = await rulesClient.update({
      id: existingRule.id,
      data: newInternalRule,
    });

    await toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleUpdate.enabled);

    return { ...update, enabled: ruleUpdate.enabled ?? existingRule.enabled };
  });
