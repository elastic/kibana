/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleTypeModel,
  RuleTypeParams,
  RuleTypeRegistryContract,
} from '../../../triggers_actions_ui/public';
import { ParsedTechnicalFields } from '../../../rule_registry/common/parse_technical_fields';
import { AsDuration, AsPercent } from '../../common/utils/formatters';

export type ObservabilityRuleTypeFormatter = (options: {
  fields: ParsedTechnicalFields & Record<string, any>;
  formatters: { asDuration: AsDuration; asPercent: AsPercent };
}) => { reason: string; link: string };

export interface ObservabilityRuleTypeModel<Params extends RuleTypeParams = RuleTypeParams>
  extends RuleTypeModel<Params> {
  format: ObservabilityRuleTypeFormatter;
}

export function createObservabilityRuleTypeRegistry(ruleTypeRegistry: RuleTypeRegistryContract) {
  const formatters: Array<{ typeId: string; fn: ObservabilityRuleTypeFormatter }> = [];

  return {
    register: (type: ObservabilityRuleTypeModel<any>) => {
      const { format, ...rest } = type;
      formatters.push({ typeId: type.id, fn: format });
      ruleTypeRegistry.register(rest);
    },
    getFormatter: (typeId: string) => {
      return formatters.find((formatter) => formatter.typeId === typeId)?.fn;
    },
  };
}

export type ObservabilityRuleTypeRegistry = ReturnType<typeof createObservabilityRuleTypeRegistry>;
