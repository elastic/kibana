/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_DETAILS_TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.header.technicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const SUMMARY_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.navigation.summary',
  {
    defaultMessage: 'Summary',
  }
);

export const BACK_TO_ALERTS_LINK = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.header.backToAlerts',
  {
    defaultMessage: 'Back to alerts',
  }
);

export const LOADING_PAGE_MESSAGE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.loadingPage.message',
  {
    defaultMessage: 'Loading details page...',
  }
);

export const ERROR_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.errorPage.title',
  {
    defaultMessage: 'Unable to load the details page',
  }
);

export const ERROR_PAGE_BODY = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.errorPage.message',
  {
    defaultMessage:
      'There was an error loading the details page. Please confirm the following id points to a valid document',
  }
);
