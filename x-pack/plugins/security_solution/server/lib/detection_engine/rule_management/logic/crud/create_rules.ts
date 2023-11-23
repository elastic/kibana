/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type {
  RuleCreateProps,
  Prebuilt,
  IsRuleImmutable,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { convertCreateAPIToInternalSchema } from '../../normalization/rule_converters';
import type { RuleParams } from '../../../rule_schema';

export interface CreateRulesOptions<T extends RuleCreateProps = RuleCreateProps> {
  rulesClient: RulesClient;
  params: T;
  id?: string;
  isPrebuilt?: boolean;
  defaultEnabled?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export type RuleCreateAndImportProps = RuleCreateProps & {
  prebuilt?: Prebuilt;
  immutable?: IsRuleImmutable;
};

const getIsRuleToCreatePrebuilt = (
  params: RuleCreateAndImportProps,
  isPrebuilt?: boolean
): boolean => {
  // If createRules is explicitly called with isPrebuilt, use that value.
  // Use case when creating a custom rule or installing/updating a prebuilt rule.
  if (isPrebuilt != null) {
    return isPrebuilt;
  }

  // Otherwise, check the passed prebuilt or immutable params for existence.
  // Use case when importing a rule. Default to false if neither are passed.
  return (Boolean(params.prebuilt) || params.immutable) ?? false;
};

export const createRules = async ({
  rulesClient,
  params,
  id,
  isPrebuilt,
  defaultEnabled = true,
  allowMissingConnectorSecrets,
}: CreateRulesOptions<RuleCreateAndImportProps>): Promise<SanitizedRule<RuleParams>> => {
  const isRuleToCreatePrebuilt = getIsRuleToCreatePrebuilt(params, isPrebuilt);
  const internalRule = convertCreateAPIToInternalSchema(
    params,
    isRuleToCreatePrebuilt,
    defaultEnabled
  );
  const rule = await rulesClient.create<RuleParams>({
    options: {
      id,
    },
    data: internalRule,
    allowMissingConnectorSecrets,
  });

  return rule;
};
