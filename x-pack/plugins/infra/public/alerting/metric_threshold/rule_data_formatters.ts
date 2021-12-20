/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '-';
  const link = '/app/metrics/explorer'; // TODO https://github.com/elastic/kibana/issues/106497 & https://github.com/elastic/kibana/issues/106958

  return {
    reason,
    link,
  };
};
