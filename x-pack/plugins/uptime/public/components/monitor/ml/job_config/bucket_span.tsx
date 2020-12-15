/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { BucketSpanInput } from './bucket_span_input';
import { useFetcher } from '../../../../../../observability/public';
import { getBucketSpanEstimate } from '../../../../state/api/ml_anomaly';
import { TimeRange } from './job_config';
import { useMonitorId } from '../../../../hooks';
import { hasMLFeatureSelector } from '../../../../state/selectors';

const startTimeLabel = i18n.translate('xpack.uptime.ml.jobConfig.bucketSpanLabel', {
  defaultMessage: 'Bucket span',
});

export const isValidBucketSpan = (bs: string) => {
  // 30s, 10m, 1h, 7d format allowed
  return /^\d+[smhd]/.test(bs);
};

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
  disabled?: boolean;
  timeRange: TimeRange;
}

const getValidationError = (value: string) =>
  value === ''
    ? i18n.translate('xpack.uptime.ml.jobConfig.bucketSpan.errorEmpty', {
        defaultMessage: 'Bucket span is required.',
      })
    : i18n.translate('xpack.uptime.ml.jobConfig.bucketSpan.error', {
        defaultMessage:
          '{value} is not a valid time interval format e.g. 30s, 10m, 1h, 7d. It also needs to be higher than zero.',
        values: {
          value,
        },
      });

export const JobBucketSpan: React.FC<Props> = ({
  timeRange,
  bucketSpan,
  setBucketSpan,
  disabled = false,
}) => {
  const isInValid = !isValidBucketSpan(bucketSpan);

  const monitorId = useMonitorId();

  const [loading, setLoading] = useState(false);

  const hasMlFeature = useSelector(hasMLFeatureSelector);

  const { data: bsData } = useFetcher(() => {
    if (loading) {
      return getBucketSpanEstimate(timeRange, monitorId);
    }
    return Promise.resolve();
  }, [monitorId, loading]);

  useEffect(() => {
    if (bsData?.name) {
      setBucketSpan(bsData.name);
    }
    setLoading(false);
  }, [bsData, setBucketSpan]);
  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.uptime.ml.jobConfig.bucketSpanTitle"
            defaultMessage="Bucket span"
          />
        </h3>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.ml.jobConfig.bucketSpanDescription"
          defaultMessage="Set the interval for time series analysis, typically between 15m to 1h."
        />
      }
    >
      <EuiFormRow
        fullWidth
        error={getValidationError(bucketSpan)}
        isInvalid={isInValid}
        label={startTimeLabel}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFormControlLayout isDisabled={disabled}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <BucketSpanInput
                  bucketSpan={bucketSpan}
                  setBucketSpan={setBucketSpan}
                  disabled={false}
                  aria-label={i18n.translate('xpack.uptime.ml.job.bucketSpan', {
                    defaultMessage: 'Bucket span',
                  })}
                  isInvalid={isInValid}
                  loading={loading}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ alignSelf: 'center' }}>
                <EuiButton
                  disabled={loading || !hasMlFeature}
                  size="s"
                  onClick={() => {
                    setLoading(true);
                  }}
                  data-test-subj={'uptimeAnomalyJobEstimateBS'}
                >
                  {i18n.translate('xpack.uptime.ml.job.bucketSpan.estimate', {
                    defaultMessage: 'Estimate bucket span',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormControlLayout>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
