/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMESTAMP,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_NAME,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import { parseTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { parseExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import type { TopAlert } from '..';
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';

export const parseAlert =
  (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry) =>
  (alert: Record<string, unknown>): TopAlert => {
    const experimentalFields = Object.keys(experimentalRuleFieldMap);
    const alertWithExperimentalFields = experimentalFields.reduce((acc, key) => {
      if (alert[key]) {
        return { ...acc, [key]: alert[key] };
      }
      return acc;
    }, {});

    const parsedFields = {
      ...parseTechnicalFields(alert, true),
      ...parseExperimentalFields(alertWithExperimentalFields, true),
    };

    const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[ALERT_RULE_TYPE_ID]!);
    const formatted = {
      link: undefined,
      reason: parsedFields[ALERT_REASON] ?? parsedFields[ALERT_RULE_NAME] ?? '',
      ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
    };

    return {
      ...formatted,
      fields: parsedFields,
      active: parsedFields[ALERT_STATUS] === ALERT_STATUS_ACTIVE,
      start: new Date(parsedFields[ALERT_START] ?? 0).getTime(),
      lastUpdated: new Date(parsedFields[TIMESTAMP] ?? 0).getTime(),
    };
  };
