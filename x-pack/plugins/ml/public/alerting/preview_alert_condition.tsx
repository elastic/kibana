/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton } from '@elastic/eui';
import type { AlertingApiService } from '../application/services/ml_api_service/alerting';
import { MlAnomalyThresholdAlertParams } from './ml_anomaly_threshold_trigger';

export interface PreviewAlertConditionProps {
  alertingApiService: AlertingApiService;
  alertParams: MlAnomalyThresholdAlertParams;
}

export const PreviewAlertCondition: FC<PreviewAlertConditionProps> = ({
  alertingApiService,
  alertParams,
}) => {
  const testCondition = async () => {
    await alertingApiService.preview(alertParams);
  };

  return <EuiButton onClick={testCondition}>Test</EuiButton>;
};
