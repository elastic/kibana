/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_WRITE_ALERTS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.noWriteAlertsCallOutTitle',
  {
    defaultMessage: 'You cannot change alert states',
  }
);

export const NO_WRITE_ALERTS_CALLOUT_MSG = i18n.translate(
  'xpack.securitySolution.detectionEngine.noWriteAlertsCallOutMsg',
  {
    defaultMessage:
      'You only have permissions to view alerts. If you need to update alert states (open or close alerts), contact your Kibana administrator.',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.securitySolution.detectionEngine.dismissNoWriteAlertButton',
  {
    defaultMessage: 'Dismiss',
  }
);
