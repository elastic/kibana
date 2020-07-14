/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { callApmApi } from '../../../../services/rest/createCallApmApi';

export async function createJobs({
  environments,
  toasts,
}: {
  environments: string[];
  toasts: NotificationsStart['toasts'];
}) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/anomaly-detection/jobs',
      method: 'POST',
      params: {
        body: { environments },
      },
    });

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.anomalyDetection.createJobs.succeeded.title',
        { defaultMessage: 'Anomaly detection jobs created' }
      ),
      text: i18n.translate(
        'xpack.apm.anomalyDetection.createJobs.succeeded.text',
        {
          defaultMessage:
            'Anomaly detection jobs successfully created for APM service environments [{environments}]. It will take some time for machine learning to start analyzing traffic for anomalies.',
          values: { environments: environments.join(', ') },
        }
      ),
    });
    return true;
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.anomalyDetection.createJobs.failed.title',
        {
          defaultMessage: 'Anomaly detection jobs could not be created',
        }
      ),
      text: i18n.translate(
        'xpack.apm.anomalyDetection.createJobs.failed.text',
        {
          defaultMessage:
            'Something went wrong when creating one ore more anomaly detection jobs for APM service environments [{environments}]. Error: "{errorMessage}"',
          values: {
            environments: environments.join(', '),
            errorMessage: error.message,
          },
        }
      ),
    });
    return false;
  }
}
