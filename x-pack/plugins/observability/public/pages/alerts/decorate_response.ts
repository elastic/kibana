/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RULE_ID as RULE_ID_TYPED,
  RULE_NAME as RULE_NAME_TYPED,
  ALERT_STATUS as ALERT_STATUS_TYPED,
  ALERT_START as ALERT_START_TYPED,
} from '@kbn/rule-data-utils';
import {
  RULE_ID as RULE_ID_NON_TYPED,
  RULE_NAME as RULE_NAME_NON_TYPED,
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
  ALERT_START as ALERT_START_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import type { TopAlertResponse, TopAlert } from '.';
import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { asDuration, asPercent } from '../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';

const RULE_ID: typeof RULE_ID_TYPED = RULE_ID_NON_TYPED;
const RULE_NAME: typeof RULE_NAME_TYPED = RULE_NAME_NON_TYPED;
const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;
const ALERT_START: typeof ALERT_START_TYPED = ALERT_START_NON_TYPED;

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
