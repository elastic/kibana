/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';
import type { ImportRuleResponse } from '../../../routes/utils';
import { createBulkErrorObject } from '../../../routes/utils';
import { createRules } from '../crud/create_rules';
import { readRules } from '../crud/read_rules';
import { updateRules } from '../crud/update_rules';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';

export async function importRule({
  ruleToImport,
  overwriteExisting,
  rulesClient,
  mlAuthz,
  allowMissingConnectorSecrets,
}: {
  ruleToImport: RuleToImport;
  overwriteExisting: boolean;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  allowMissingConnectorSecrets?: boolean;
}): Promise<ImportRuleResponse> {
  try {
    throwAuthzError(await mlAuthz.validateRuleType(ruleToImport.type));
    const existingRule = await readRules({
      rulesClient,
      ruleId: ruleToImport.rule_id,
      id: undefined,
    });

    if (existingRule != null && !overwriteExisting) {
      return createBulkErrorObject({
        ruleId: ruleToImport.rule_id,
        statusCode: 409,
        message: `rule_id: "${ruleToImport.rule_id}" already exists`,
      });
    }

    if (existingRule == null) {
      await createRules({
        rulesClient,
        params: ruleToImport,
        allowMissingConnectorSecrets,
      });

      return {
        rule_id: ruleToImport.rule_id,
        status_code: 200,
      };
    }

    await updateRules({
      rulesClient,
      existingRule,
      ruleUpdate: ruleToImport,
      allowMissingConnectorSecrets,
    });

    return {
      rule_id: ruleToImport.rule_id,
      status_code: 200,
    };
  } catch (err) {
    return createBulkErrorObject({
      ruleId: ruleToImport.rule_id,
      statusCode: err.statusCode ?? 400,
      message: err.message,
    });
  }
}
