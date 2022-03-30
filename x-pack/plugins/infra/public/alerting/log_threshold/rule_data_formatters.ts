/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_START } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';
import { getLogsAppAlertUrl } from '../../../common/formatters/alert_link';

export const formatRuleData: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '';
  const alertStartDate = fields[ALERT_START];
  const timestamp = alertStartDate != null ? new Date(alertStartDate).valueOf() : null;

  return {
    reason,
    link: getLogsAppAlertUrl(timestamp), // TODO: refactor to URL generators
  };
};
