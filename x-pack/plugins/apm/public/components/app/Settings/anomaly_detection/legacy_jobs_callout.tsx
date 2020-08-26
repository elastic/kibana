/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';

export function LegacyJobsCallout() {
  const { core } = useApmPluginContext();
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.apm.settings.anomaly_detection.legacy_jobs.title',
        { defaultMessage: 'Legacy ML jobs are no longer used in APM app' }
      )}
      iconType="iInCircle"
    >
      <p>
        {i18n.translate(
          'xpack.apm.settings.anomaly_detection.legacy_jobs.body',
          {
            defaultMessage:
              'We have discovered legacy Machine Learning jobs from our previous integration which are no longer being used in the APM app',
          }
        )}
      </p>
      <EuiButton
        href={core.http.basePath.prepend(
          '/app/ml#/jobs?mlManagement=(jobId:high_mean_response_time)'
        )}
      >
        {i18n.translate(
          'xpack.apm.settings.anomaly_detection.legacy_jobs.button',
          { defaultMessage: 'Review jobs' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
