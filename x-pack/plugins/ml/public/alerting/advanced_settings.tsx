/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { MlAnomalyDetectionAlertAdvancedSettings } from '../../common/types/alerts';
import { TimeIntervalControl } from './time_interval_control';
import { TOP_N_BUCKETS_COUNT } from '../../common/constants/alerts';

interface AdvancedSettingsProps {
  value: MlAnomalyDetectionAlertAdvancedSettings;
  onChange: (update: Partial<MlAnomalyDetectionAlertAdvancedSettings>) => void;
}

export const AdvancedSettings: FC<AdvancedSettingsProps> = React.memo(({ value, onChange }) => {
  return (
    <EuiAccordion
      id="mlAnomalyAlertAdvancedSettings"
      buttonContent={
        <FormattedMessage
          id="xpack.ml.anomalyDetectionAlert.advancedSettingsLabel"
          defaultMessage="Advanced settings"
        />
      }
      data-test-subj={'mlAnomalyAlertAdvancedSettingsTrigger'}
    >
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        gutterSize={'s'}
        titleSize={'xxs'}
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.lookbackIntervalLabel"
              defaultMessage="Lookback interval"
            />
          </h4>
        }
        description={
          <EuiText size={'xs'}>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.lookbackIntervalDescription"
              defaultMessage="Time interval to query the anomalies data during each rule condition check. By default, is derived from the bucket span of the job and the query delay of the datafeed."
            />
          </EuiText>
        }
      >
        <TimeIntervalControl
          value={value.lookbackInterval}
          label={
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.lookbackIntervalLabel"
              defaultMessage="Lookback interval"
            />
          }
          onChange={(update) => {
            onChange({ lookbackInterval: update });
          }}
          data-test-subj={'mlAnomalyAlertLookbackInterval'}
        />
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        gutterSize={'s'}
        titleSize={'xxs'}
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.topNBucketsLabel"
              defaultMessage="Number of latest buckets"
            />
          </h4>
        }
        description={
          <EuiText size={'xs'}>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.topNBucketsDescription"
              defaultMessage="The number of latest buckets to check to obtain the highest anomaly."
            />
          </EuiText>
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.topNBucketsLabel"
              defaultMessage="Number of latest buckets"
            />
          }
        >
          <EuiFieldNumber
            value={value.topNBuckets ?? TOP_N_BUCKETS_COUNT}
            min={1}
            onChange={(e) => {
              onChange({ topNBuckets: Number(e.target.value) });
            }}
            data-test-subj={'mlAnomalyAlertTopNBuckets'}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiHorizontalRule margin={'m'} />
    </EuiAccordion>
  );
});
