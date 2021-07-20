/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_START,
  ALERT_ID,
} from '@kbn/rule-data-utils';
import { modifyUrl } from '@kbn/std';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const actualCount = fields[ALERT_EVALUATION_VALUE];
  const thresholdCount = fields[ALERT_EVALUATION_THRESHOLD];
  const groupName = fields[ALERT_ID];
  const reason = i18n.translate('xpack.infra.metrics.alerting.inventory.alertReasonDescription', {
    defaultMessage:
      'Current value is {actualCount} (threshold of {thresholdCount}) for {groupName}.',
    values: {
      actualCount,
      thresholdCount,
      groupName,
    },
  });

  const alertStartDate = fields[ALERT_START];
  const timestamp = alertStartDate != null ? new Date(alertStartDate).valueOf() : null;
  const link = modifyUrl('/app/metrics/link-to/default/metrics', ({ query, ...otherUrlParts }) => ({
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
