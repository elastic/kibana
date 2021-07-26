/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatReason: ObservabilityRuleTypeFormatter = () => {
  const reason = i18n.translate('xpack.infra.metrics.alerting.threshold.alertReasonDescription', {
    defaultMessage: 'Metric threshold', // TEMP reason message, will be deleted once we index the reason field
  });
  const link = '';

  return {
    reason,
    link,
  };
};
