/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { callApmApi } from '../../../../services/rest/createCallApmApi';

export function UpdateJobsCallout({
  onUpdateComplete,
}: {
  onUpdateComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { core } = useApmPluginContext();

  function upgradeJobs() {
    setLoading(true);
    callApmApi({
      endpoint: 'POST /internal/apm/settings/anomaly-detection/update_to_v3',
      signal: null,
    })
      .then(() => {
        core.notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.apm.jobsList.updateCompletedToastTitle',
            {
              defaultMessage: 'Anomaly detection jobs created!',
            }
          ),
          text: i18n.translate('xpack.apm.jobsList.updateCompletedToastText', {
            defaultMessage:
              'Your new anomaly detection jobs have been created successfully. You will start to see anomaly detection results in the app within minutes. The old jobs have been closed but the results are still available within Machine Learning.',
          }),
        });
        onUpdateComplete();
      })
      .catch(() => {
        setLoading(false);
      });
  }

  return (
    <EuiCallOut
      color="success"
      title={i18n.translate(
        'xpack.apm.settings.anomalyDetection.jobsList.updateAvailableTitle',
        { defaultMessage: 'Updates available' }
      )}
      iconType="wrench"
    >
      <p>
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobsList.updateAvailableDescription',
          {
            defaultMessage:
              'We have updated the anomaly detection jobs that provide insights into degraded performance and added detectors for throughput and failed transaction rate. If you choose to upgrade, we will create the new jobs and close the existing legacy jobs. The data shown in the APM app will automatically switch to the new.',
          }
        )}
      </p>
      <EuiButton
        isLoading={loading}
        color="success"
        onClick={() => upgradeJobs()}
      >
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobsList.updateAvailableButtonText',
          { defaultMessage: 'Update jobs' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
