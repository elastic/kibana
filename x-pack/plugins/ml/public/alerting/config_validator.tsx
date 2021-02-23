/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { parseInterval } from '../../common/util/parse_interval';
import { CombinedJobWithStats, JobId } from '../../common/types/anomaly_detection_jobs';
import { DATAFEED_STATE, JOB_STATE } from '../../common/constants/states';
import { resolveBucketSpanInSeconds } from '../../common/util/job_utils';

interface ConfigValidatorProps {
  alertInterval: string;
  jobConfigs: CombinedJobWithStats[];
}

/**
 * Validated alert configuration
 */
export const ConfigValidator: FC<ConfigValidatorProps> = React.memo(
  ({ jobConfigs = [], alertInterval }) => {
    const resultBucketSpanInSeconds = useMemo(
      () => resolveBucketSpanInSeconds(jobConfigs.map((v) => v.analysis_config.bucket_span)),
      [jobConfigs]
    );

    const resultBucketSpanString =
      resultBucketSpanInSeconds % 60 === 0
        ? `${resultBucketSpanInSeconds / 60}m`
        : `${resultBucketSpanInSeconds}s`;

    if (jobConfigs.length === 0) return null;

    const alertIntervalInSeconds = parseInterval(alertInterval)!.asSeconds();

    const isAlertIntervalTooHigh = resultBucketSpanInSeconds < alertIntervalInSeconds;

    const jobIssues = jobConfigs.reduce(
      (acc, job) => {
        if (job.state === JOB_STATE.FAILED) {
          acc.failedJobsIds.push(job.job_id);
        }
        if ([JOB_STATE.CLOSING, JOB_STATE.CLOSED].includes(job.state)) {
          acc.closedJobIds.push(job.job_id);
        }
        if ([DATAFEED_STATE.STOPPING, DATAFEED_STATE.STOPPED].includes(job.datafeed_config.state)) {
          acc.stoppedDatafeedJobIds.push(job.job_id);
        }
        if (job.datafeed_config.state === DATAFEED_STATE.DELETED) {
          acc.deletedDatafeedJobIds.push(job.job_id);
        }
        return acc;
      },
      {
        failedJobsIds: [],
        closedJobIds: [],
        stoppedDatafeedJobIds: [],
        deletedDatafeedJobIds: [],
      } as Record<
        'failedJobsIds' | 'closedJobIds' | 'stoppedDatafeedJobIds' | 'deletedDatafeedJobIds',
        JobId[]
      >
    );

    const configContainsIssues =
      isAlertIntervalTooHigh || Object.values(jobIssues).some((v) => v.length > 0);

    if (!configContainsIssues) return null;

    return (
      <>
        <EuiSpacer size={'m'} />
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.alertConditionValidation.title"
              defaultMessage="Alert condition contains the following issues:"
            />
          }
          color="warning"
          size={'s'}
        >
          <ul>
            {isAlertIntervalTooHigh ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.alertIntervalTooHighMessage"
                  defaultMessage="The check interval is greater than the maximum bucket span of the selected jobs. Reduce it to {resultBucketSpan} to avoid excessive delay in receiving notifications."
                  values={{
                    resultBucketSpan: resultBucketSpanString,
                  }}
                />
              </li>
            ) : null}

            {jobIssues.failedJobsIds.length > 0 ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.failedJobsMessage"
                  defaultMessage="The following {count, plural, one {job is} other {jobs have}} failed: {jobIds}."
                  values={{
                    count: jobIssues.failedJobsIds.length,
                    jobIds: jobIssues.failedJobsIds.join(', '),
                  }}
                />
              </li>
            ) : null}

            {jobIssues.closedJobIds.length > 0 ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.closedJobsMessage"
                  defaultMessage="The following {count, plural, one {job is} other {jobs are}} closed: {jobIds}."
                  values={{
                    count: jobIssues.closedJobIds.length,
                    jobIds: jobIssues.closedJobIds.join(', '),
                  }}
                />
              </li>
            ) : null}

            {jobIssues.stoppedDatafeedJobIds.length > 0 ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.stoppedDatafeedJobsMessage"
                  defaultMessage="The datafeed is currently stopped for the following {count, plural, one {job} other {jobs}}: {jobIds}."
                  values={{
                    count: jobIssues.stoppedDatafeedJobIds.length,
                    jobIds: jobIssues.stoppedDatafeedJobIds.join(', '),
                  }}
                />
              </li>
            ) : null}

            {jobIssues.deletedDatafeedJobIds.length > 0 ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.deletedDatafeedJobsMessage"
                  defaultMessage="The datafeed is deleted for the following {count, plural, one {job} other {jobs}}: {jobIds}."
                  values={{
                    count: jobIssues.deletedDatafeedJobIds.length,
                    jobIds: jobIssues.deletedDatafeedJobIds.join(', '),
                  }}
                />
              </li>
            ) : null}
          </ul>
        </EuiCallOut>
        <EuiSpacer size={'m'} />
      </>
    );
  }
);
