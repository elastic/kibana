/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_ID,
  RULE_NAME,
  ALERT_STATUS,
  ALERT_START,
} from '@kbn/rule-data-utils/target/technical_field_names';
import type { TopAlertResponse, TopAlert } from '.';
import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { asDuration, asPercent } from '../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';

export function decorateResponse(
  alerts: TopAlertResponse[],
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
): TopAlert[] {
  return alerts.map((alert) => {
    const parsedFields = parseTechnicalFields(alert);
    const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[RULE_ID]!);
    const formatted = {
      link: undefined,
      reason: parsedFields[RULE_NAME]!,
      ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
    };

    return {
      ...formatted,
      fields: parsedFields,
      active: parsedFields[ALERT_STATUS] !== 'closed',
      start: new Date(parsedFields[ALERT_START]!).getTime(),
    };
  });
}
