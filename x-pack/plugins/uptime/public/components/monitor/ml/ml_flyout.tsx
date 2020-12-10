/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSelector } from 'react-redux';
import moment from 'moment';
import * as labels from './translations';
import { UptimeSettingsContext } from '../../../contexts';
import { ShowLicenseInfo } from './license_info';
import { hasMLFeatureSelector } from '../../../state/selectors';
import { JobConfig, TimeRange } from './job_config/job_config';
import { isValidBucketSpan } from './job_config/bucket_span';

interface Props {
  isCreatingJob: boolean;
  onClickCreate: (config: { timeRange: TimeRange; bucketSpan: string }) => void;
  onClose: () => void;
  canCreateMLJob: boolean;
}

export function MLFlyoutView({ isCreatingJob, onClickCreate, onClose, canCreateMLJob }: Props) {
  const { basePath } = useContext(UptimeSettingsContext);

  const hasMlFeature = useSelector(hasMLFeatureSelector);

  const [bucketSpan, setBucketSpan] = useState('15m');

  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: moment().subtract(2, 'week').valueOf(),
  });

  const invalidData = !bucketSpan || !isValidBucketSpan(bucketSpan) || !timeRange?.start;

  const isLoadingMLJob = false;

  const inProgress = isCreatingJob || isLoadingMLJob;

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="uptimeMLFlyout" style={{ width: 800 }}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{labels.ENABLE_ANOMALY_DETECTION}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!hasMlFeature && <ShowLicenseInfo />}
        <EuiText>
          <p>{labels.CREAT_ML_JOB_DESC}</p>
          <p>
            <FormattedMessage
              id="xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription"
              defaultMessage="Once a job is created, you can manage it and see more details in the {mlJobsPageLink}."
              values={{
                mlJobsPageLink: (
                  <EuiLink href={basePath + '/app/ml'}>{labels.ML_MANAGEMENT_PAGE}</EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <JobConfig
          bucketSpan={bucketSpan}
          setBucketSpan={setBucketSpan}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
        />
        <EuiText size="s">
          <p>
            <em>{labels.TAKE_SOME_TIME_TEXT}</em>
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} disabled={inProgress}>
              {labels.CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uptimeMLCreateJobBtn"
              onClick={() => onClickCreate({ timeRange, bucketSpan })}
              fill
              isLoading={isCreatingJob}
              disabled={inProgress || !hasMlFeature || !canCreateMLJob || invalidData}
            >
              {labels.CREATE_NEW_JOB}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
