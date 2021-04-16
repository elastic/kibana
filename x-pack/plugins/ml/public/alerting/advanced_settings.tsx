/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { MlAnomalyDetectionAlertAdvancedSettings } from '../../common/types/alerts';
import { TimeIntervalControl } from './time_interval_control';
import { numberValidator, timeIntervalInputValidator } from '../../common/util/validators';
import { TOP_N_BUCKETS_COUNT } from '../../common/constants/alerts';

interface AdvancedSettingsProps {
  value: MlAnomalyDetectionAlertAdvancedSettings;
  onChange: (update: Partial<MlAnomalyDetectionAlertAdvancedSettings>) => void;
}

export const validateLookbackInterval = timeIntervalInputValidator();

export const validateTopNBucket = numberValidator({ min: 1 });

export const AdvancedSettings: FC<AdvancedSettingsProps> = React.memo(({ value, onChange }) => {
  return (
    <EuiAccordion
      id="mlAlertAdvancedSettings"
      buttonContent={
        <FormattedMessage
          id="xpack.ml.anomalyDetectionAlert.advancedSettingsLabel"
          defaultMessage="Advanced settings"
        />
      }
    >
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        gutterSize={'s'}
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.lookbackIntervalLabel"
              defaultMessage="Lookback interval"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.ml.anomalyDetectionAlert.lookbackIntervalDescription"
            defaultMessage="Lookback interval description"
          />
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
        />
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        gutterSize={'s'}
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.topNBucketsLabel"
              defaultMessage="Top N buckets"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.ml.anomalyDetectionAlert.topNBucketsDescription"
            defaultMessage="Top N buckets description"
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.topNBucketsLabel"
              defaultMessage="Top N buckets"
            />
          }
        >
          <EuiFieldNumber
            value={value.topNBuckets ?? TOP_N_BUCKETS_COUNT}
            min={1}
            onChange={(e) => {
              onChange({ topNBuckets: Number(e.target.value) });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
});
