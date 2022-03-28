/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ParsedTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { getInventoryViewInAppUrl } from '../../../common/alerting/metrics/alert_link';

export type ObservabilityRuleTypeFieldsOnly = (options: {
  fields: ParsedTechnicalFields & Record<string, any>;
}) => { reason: string; link: string };

export const formatReason: ObservabilityRuleTypeFieldsOnly = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '-';

  return {
    reason,
    link: getInventoryViewInAppUrl(fields),
  };
};
