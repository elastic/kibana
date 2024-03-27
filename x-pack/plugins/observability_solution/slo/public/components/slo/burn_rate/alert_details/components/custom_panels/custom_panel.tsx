/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { GetSLOResponse } from '@kbn/slo-schema';
import { APMAlertDetails } from '../apm/apm_alert_details';
import { BurnRateAlert, BurnRateRule } from '../../types';
import { getDataTimeRange } from '../../utils/time_range';
import type { APMTransactionDurationSLOResponse } from '../apm/apm_alert_details';

export function CustomAlertDetailsPanel({
  slo,
  alert,
  rule,
}: {
  slo?: GetSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}) {
  const dataTimeRange = getDataTimeRange(alert);
  switch (slo?.indicator.type) {
    case 'sli.apm.transactionDuration':
      return (
        <APMAlertDetails
          slo={slo as APMTransactionDurationSLOResponse}
          dataTimeRange={dataTimeRange}
          alert={alert}
          rule={rule}
        />
      );
    default:
      return null;
  }
}
