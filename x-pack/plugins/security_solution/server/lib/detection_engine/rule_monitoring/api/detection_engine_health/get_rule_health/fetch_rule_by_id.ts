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
} from '../../../../../../../common/detection_engine/rule_schema';
import type { OutputError } from '../../../../routes/utils';
import { readRules } from '../../../../rule_management/logic/crud/read_rules';
import { getIdError, transform } from '../../../../rule_management/utils/utils';

// TODO: https://github.com/elastic/kibana/issues/125642 Move to rule_management into a RuleManagementClient

export type Either<TValue, TError> =
  | { value: TValue; error?: never }
  | { value?: never; error: TError };

export type FetchRuleByIdResult = Either<RuleResponse, OutputError>;

export const fetchRuleById = async (
  rulesClient: RulesClient,
  id: RuleObjectId
): Promise<FetchRuleByIdResult> => {
  const rawRule = await readRules({
    id,
    rulesClient,
    ruleId: undefined,
  });

  if (rawRule == null) {
    const error = getIdError({ id, ruleId: undefined });
    return { error };
  }

  const normalizedRule = transform(rawRule);

  if (normalizedRule == null) {
    const error: OutputError = {
      statusCode: 500,
      message: 'Internal error normalizing rule object',
    };
    return { error };
  }

  return { value: normalizedRule };
};
