/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';

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
    await callApmApi('POST /internal/apm/settings/anomaly-detection/jobs', {
      signal: null,
      params: {
        body: { environments },
      },
    });

    toasts.addSuccess({
      title: successToastTitle,
      text: getSuccessToastMessage(environments),
    });
    return true;
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
      'Something went wrong when creating one or more anomaly detection jobs for APM service environments [{environments}]. Error: "{errorMessage}"',
    values: {
      environments: environments.join(', '),
      errorMessage: error.message,
    },
  });
}
