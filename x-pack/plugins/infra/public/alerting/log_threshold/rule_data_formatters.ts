/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_START } from '@kbn/rule-data-utils';
import { modifyUrl } from '@kbn/std';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatRuleData: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '';
  const alertStartDate = fields[ALERT_START];
  const timestamp = alertStartDate != null ? new Date(alertStartDate).valueOf() : null;
  const link = modifyUrl('/app/logs/link-to/default/logs', ({ query, ...otherUrlParts }) => ({
    ...otherUrlParts,
    query: {
      ...query,
      ...(timestamp != null ? { time: `${timestamp}` } : {}),
    },
  }));

  return {
    reason,
    link, // TODO: refactor to URL generators
  };
};
