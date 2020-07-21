/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { MLErrorMessages } from '../../../../../common/anomaly_detection';
import { callApmApi } from '../../../../services/rest/createCallApmApi';

const errorToastTitle = i18n.translate(
  'xpack.apm.anomalyDetection.createJobs.failed.title',
  { defaultMessage: 'Anomaly detection jobs could not be created' }
);

const successToastTitle = i18n.translate(
  'xpack.apm.anomalyDetection.createJobs.succeeded.title',
  { defaultMessage: 'Anomaly detection jobs created' }
);

export async function createJobs({
  environments,
  toasts,
}: {
  environments: string[];
  toasts: NotificationsStart['toasts'];
}) {
  try {
    const res = await callApmApi({
      pathname: '/api/apm/settings/anomaly-detection/jobs',
      method: 'POST',
      params: {
        body: { environments },
      },
    });

    // a known error occurred
    if (res?.errorCode) {
      toasts.addDanger({
        title: errorToastTitle,
        text: MLErrorMessages[res.errorCode],
      });
      return false;
    }

    // job created successfully
    toasts.addSuccess({
      title: successToastTitle,
      text: getSuccessToastMessage(environments),
    });
    return true;

    // an unknown/unexpected error occurred
  } catch (error) {
    toasts.addDanger({
      title: errorToastTitle,
      text: getErrorToastMessage(environments, error),
    });
    return false;
  }
}

function getSuccessToastMessage(environments: string[]) {
  return i18n.translate(
    'xpack.apm.anomalyDetection.createJobs.succeeded.text',
    {
      defaultMessage:
        'Anomaly detection jobs successfully created for APM service environments [{environments}]. It will take some time for machine learning to start analyzing traffic for anomalies.',
      values: { environments: environments.join(', ') },
    }
  );
}

function getErrorToastMessage(environments: string[], error: Error) {
  return i18n.translate('xpack.apm.anomalyDetection.createJobs.failed.text', {
    defaultMessage:
      'Something went wrong when creating one ore more anomaly detection jobs for APM service environments [{environments}]. Error: "{errorMessage}"',
    values: {
      environments: environments.join(', '),
      errorMessage: error.message,
    },
  });
}
