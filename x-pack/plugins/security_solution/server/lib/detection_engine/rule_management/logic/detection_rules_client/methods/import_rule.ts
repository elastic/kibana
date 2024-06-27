/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { ImportRuleArgs } from '../detection_rules_client_interface';
import type { RuleAlertType, RuleParams } from '../../../../rule_schema';
import { createBulkErrorObject } from '../../../../routes/utils';
import {
  convertCreateAPIToInternalSchema,
  convertUpdateAPIToInternalSchema,
  internalRuleToAPIResponse,
} from '../../../normalization/rule_converters';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';

import { validateMlAuth, RuleResponseValidationError } from '../utils';

import { readRules } from '../read_rules';

export const importRule = async (
  rulesClient: RulesClient,
  importRulePayload: ImportRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { ruleToImport, overwriteRules, allowMissingConnectorSecrets } = importRulePayload;

  await validateMlAuth(mlAuthz, ruleToImport.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId: ruleToImport.rule_id,
    id: undefined,
  });

  if (existingRule && !overwriteRules) {
    throw createBulkErrorObject({
      ruleId: existingRule.params.ruleId,
      statusCode: 409,
      message: `rule_id: "${existingRule.params.ruleId}" already exists`,
    });
  }

  let importedInternalRule: RuleAlertType;

  if (existingRule && overwriteRules) {
    const ruleUpdateParams = convertUpdateAPIToInternalSchema({
      existingRule,
      ruleUpdate: ruleToImport,
    });

    importedInternalRule = await rulesClient.update({
      id: existingRule.id,
      data: ruleUpdateParams,
    });
  } else {
    /* Rule does not exist, so we'll create it */
    const ruleCreateParams = convertCreateAPIToInternalSchema(ruleToImport, {
      immutable: false,
    });

    importedInternalRule = await rulesClient.create<RuleParams>({
      data: ruleCreateParams,
      allowMissingConnectorSecrets,
    });
  }

  /* Trying to convert an internal rule to a RuleResponse object */
  const parseResult = RuleResponse.safeParse(internalRuleToAPIResponse(importedInternalRule));

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: importedInternalRule.params.ruleId,
    });
  }

  return parseResult.data;
};
