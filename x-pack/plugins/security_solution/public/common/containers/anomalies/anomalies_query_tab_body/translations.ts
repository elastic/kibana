/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ANOMALIES_STACK_BY_JOB_ID = i18n.translate(
  'xpack.securitySolution.containers.anomalies.stackByJobId',
  {
    defaultMessage: 'job',
  }
);

export const ANOMALIES_TITLE = i18n.translate('xpack.securitySolution.containers.anomalies.title', {
  defaultMessage: 'Anomalies',
});

export const ERROR_FETCHING_ANOMALIES_DATA = i18n.translate(
  'xpack.securitySolution.containers.anomalies.errorFetchingAnomaliesData',
  {
    defaultMessage: 'Failed to query anomalies data',
  }
);
