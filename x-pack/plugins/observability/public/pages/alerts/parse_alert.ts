/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_START as ALERT_START_TYPED,
  ALERT_STATUS as ALERT_STATUS_TYPED,
  ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_START as ALERT_START_NON_TYPED,
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
  ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_NON_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { TopAlert } from '.';
import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { asDuration, asPercent } from '../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';

const ALERT_START: typeof ALERT_START_TYPED = ALERT_START_NON_TYPED;
const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;
const ALERT_RULE_TYPE_ID: typeof ALERT_RULE_TYPE_ID_TYPED = ALERT_RULE_TYPE_ID_NON_TYPED;
const ALERT_RULE_NAME: typeof ALERT_RULE_NAME_TYPED = ALERT_RULE_NAME_NON_TYPED;

export const parseAlert =
  (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry) =>
  (alert: Record<string, unknown>): TopAlert => {
    const parsedFields = parseTechnicalFields(alert);
    const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[ALERT_RULE_TYPE_ID]!);
    const formatted = {
      link: undefined,
      reason: parsedFields[ALERT_RULE_NAME] ?? '',
      ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
    };

    return {
      ...formatted,
      fields: parsedFields,
      active: parsedFields[ALERT_STATUS] === ALERT_STATUS_ACTIVE,
      start: new Date(parsedFields[ALERT_START] ?? 0).getTime(),
    };
  };
