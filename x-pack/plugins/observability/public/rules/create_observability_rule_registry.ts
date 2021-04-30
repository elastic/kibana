/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnicalRuleDataFieldName } from '../../../rule_registry/common/technical_rule_data_field_names';

type Formatter = (
  fields: Record<TechnicalRuleDataFieldName, unknown[]>
) => { reason: string; link: string };

export function createObservabilityRuleRegistry() {
  const formatters: Formatter[] = [];
  return {
    registerFormatter: (typeId: string, formatter: Formatter) => {},
    getFormatters: () => formatters.concat(),
  };
}

export type ObservabilityRuleRegistry = ReturnType<typeof createObservabilityRuleRegistry>;
