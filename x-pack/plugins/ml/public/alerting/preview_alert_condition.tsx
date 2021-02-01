/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFormRow,
  EuiFieldText,
  EuiFlexItem,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
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
  const [lookBehindInterval, setLookBehindInterval] = useState<string>('');
  const [previewResponse, setPreviewResponse] = useState<any>();

  const testCondition = useCallback(async () => {
    try {
      const response = await alertingApiService.preview({
        alertParams,
        timeRange: lookBehindInterval,
      });
      setPreviewResponse(response);
    } catch (e) {
      // TODO handle error
    }
  }, [alertParams, lookBehindInterval]);

  const isReady =
    (alertParams.jobSelection?.jobIds?.length! > 0 ||
      alertParams.jobSelection?.groupIds?.length! > 0) &&
    !!alertParams.resultType &&
    !!alertParams.severity &&
    !!lookBehindInterval;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems={'flexEnd'}>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.previewAlert.intervalLabel"
                defaultMessage="Interval to check"
              />
            }
          >
            <EuiFieldText
              placeholder="15d, 6m"
              value={lookBehindInterval}
              onChange={(e) => {
                setLookBehindInterval(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={testCondition} disabled={!isReady}>
            <FormattedMessage id="xpack.ml.previewAlert.testButtonLabel" defaultMessage="Test" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {previewResponse && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            title={
              <FormattedMessage
                id="xpack.ml.previewAlert.previewMessage"
                defaultMessage="There were {alertsCount} that satisfied the conditions of the alert in the last {interval}"
                values={{
                  alertsCount: 1,
                  interval: lookBehindInterval,
                }}
              />
            }
            iconType="alert"
          />
        </>
      )}
    </>
  );
};
