/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { parseInterval, resolveBucketSpanInSeconds } from '../../common/util/parse_interval';
import { CombinedJobWithStats } from '../../common/types/anomaly_detection_jobs';

interface ConfigValidatorProps {
  alertInterval: string;
  jobConfigs: CombinedJobWithStats[];
}

/**
 * Validated alert configuration
 */
export const ConfigValidator: FC<ConfigValidatorProps> = React.memo(
  ({ jobConfigs = [], alertInterval }) => {
    const resultBucketSpan = useMemo(
      () => resolveBucketSpanInSeconds(jobConfigs.map((v) => v.analysis_config.bucket_span)),
      [jobConfigs]
    );

    if (jobConfigs.length === 0) return null;

    const alertIntervalInSeconds = parseInterval(alertInterval)!.asSeconds();

    const isAlertIntervalTooHigh = resultBucketSpan < alertIntervalInSeconds;

    return (
      <>
        <EuiSpacer size={'m'} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.alertConditionValidation.title', {
            defaultMessage: 'Alert condition contains the following issues:',
          })}
          color="warning"
        >
          <ul>
            {isAlertIntervalTooHigh ? (
              <FormattedMessage
                id="xpack.ml.alertConditionValidation.alertIntervalTooHighMessage"
                defaultMessage="Alert interval is too high. Be aware of some delay on receiving notification."
              />
            ) : null}
          </ul>
        </EuiCallOut>
        <EuiSpacer size={'m'} />
      </>
    );
  }
);
