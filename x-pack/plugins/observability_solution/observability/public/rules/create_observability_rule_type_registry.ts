/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalWidgetParameters, WidgetRenderAPI } from '@kbn/investigate-plugin/public';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import type {
  Rule,
  RuleTypeModel,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { omit, orderBy } from 'lodash';
import type { AsDuration, AsPercent } from '../../common/utils/formatters';
import type { TopAlert } from '../typings/alerts';

export type ObservabilityRuleTypeFormatter = (options: {
  fields: Record<string, any> & ParsedTechnicalFields;
  formatters: { asDuration: AsDuration; asPercent: AsPercent };
}) => { reason: string; link?: string; hasBasePath?: boolean };

export type InvestigateDetailsAppSectionProps<TParams extends Record<string, any>> = {
  alert: TopAlert;
  rule: Rule<TParams>;
} & GlobalWidgetParameters &
  Pick<WidgetRenderAPI, 'blocks' | 'onWidgetAdd'>;

export interface ObservabilityRuleTypeModel<
  TParams extends Record<string, any> = Record<string, unknown>
> extends RuleTypeModel<TParams> {
  format: ObservabilityRuleTypeFormatter;
  investigateDetailsAppSection?: (
    options: InvestigateDetailsAppSectionProps<TParams>
  ) => React.ReactNode;
  priority?: number;
}

export interface ObservabilityRuleTypeRegistry {
  isObservabilityRuleTypeModel: (
    ruleTypeModel: RuleTypeModel
  ) => ruleTypeModel is ObservabilityRuleTypeModel<Record<string, unknown>>;
  get: (ruleTypeId: string) => ObservabilityRuleTypeModel | undefined;
  register<TParams extends Record<string, any> = never>(
    type: ObservabilityRuleTypeModel<TParams>
  ): void;
  getFormatter: (typeId: string) => ObservabilityRuleTypeFormatter | undefined;
  list: () => string[];
}

export function createObservabilityRuleTypeRegistry(
  ruleTypeRegistry: RuleTypeRegistryContract
): ObservabilityRuleTypeRegistry {
  const registry: Map<string, ObservabilityRuleTypeModel> = new Map();

  return {
    isObservabilityRuleTypeModel: (
      ruleTypeModel: RuleTypeModel
    ): ruleTypeModel is ObservabilityRuleTypeModel => {
      return registry.has(ruleTypeModel.id);
    },
    get: (ruleTypeId) => registry.get(ruleTypeId),
    register: (type: ObservabilityRuleTypeModel<any>) => {
      const { format, priority, ...rest } = type;
      registry.set(type.id, type);
      ruleTypeRegistry.register(omit(rest, 'format', 'priority', 'investigateDetailsAppSection'));
    },
    getFormatter: (typeId: string) => {
      return registry.get(typeId)?.format;
    },
    list: () => {
      const allTypes = orderBy(Array.from(registry.values()), 'priority', 'desc');
      return allTypes.map((type) => type.id);
    },
  };
}
