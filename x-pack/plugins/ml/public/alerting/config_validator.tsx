/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { parseInterval } from '../../common/util/parse_interval';
import { CombinedJobWithStats } from '../../common/types/anomaly_detection_jobs';
import { DATAFEED_STATE } from '../../common/constants/states';
import { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';

interface ConfigValidatorProps {
  alertInterval: string;
  jobConfigs: CombinedJobWithStats[];
  alertParams: MlAnomalyDetectionAlertParams;
}

/**
 * Validated alert configuration
 */
export const ConfigValidator: FC<ConfigValidatorProps> = React.memo(
  ({ jobConfigs = [], alertInterval, alertParams }) => {
    if (jobConfigs.length === 0) return null;

    const alertIntervalInSeconds = parseInterval(alertInterval)!.asSeconds();

    const lookbackIntervalInSeconds =
      !!alertParams.lookbackInterval && parseInterval(alertParams.lookbackInterval)?.asSeconds();

    const isAlertIntervalTooHigh =
      lookbackIntervalInSeconds && lookbackIntervalInSeconds < alertIntervalInSeconds;

    const jobWithoutStartedDatafeed = jobConfigs
      .filter((job) => job.datafeed_config.state !== DATAFEED_STATE.STARTED)
      .map((job) => job.job_id);

    const configContainsIssues = isAlertIntervalTooHigh || jobWithoutStartedDatafeed.length > 0;

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
                  defaultMessage="The check interval is greater than the lookback interval. Reduce it to {lookbackInterval} to avoid potentially missing notifications."
                  values={{
                    lookbackInterval: alertParams.lookbackInterval,
                  }}
                />
              </li>
            ) : null}

            {jobWithoutStartedDatafeed.length > 0 ? (
              <li>
                <FormattedMessage
                  id="xpack.ml.alertConditionValidation.stoppedDatafeedJobsMessage"
                  defaultMessage="The datafeed is not started for the following {count, plural, one {job} other {jobs}}: {jobIds}."
                  values={{
                    count: jobWithoutStartedDatafeed.length,
                    jobIds: jobWithoutStartedDatafeed.join(', '),
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
