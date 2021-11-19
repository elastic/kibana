/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_START,
  ALERT_STATUS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_NAME,
} from '@kbn/rule-data-utils/technical_field_names';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils/alerts_as_data_status';
import type { TopAlert } from '../';
import { parseTechnicalFields } from '../../../../../rule_registry/common/parse_technical_fields';
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';

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
