/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = (title: string) =>
  i18n.translate('xpack.securitySolution.flyout.errorTitle', {
    values: { title },
    defaultMessage: 'Unable to display {title}',
  });

export const ERROR_MESSAGE = (message: string) =>
  i18n.translate('xpack.securitySolution.flyout.errorMessage', {
    values: { message },
    defaultMessage: 'There was an error displaying {message}',
  });

export const CORRELATIONS_SUPRESSED_ALERTS = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.correlations.supressedAlerts', {
    defaultMessage: 'suppressed {count, plural, =1 {alert} other {alerts}}',
    values: { count },
  });

export const CORRELATIONS_ANCESTRY_ALERTS = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.correlations.ancestryAlerts', {
    defaultMessage: '{count, plural, one {alert} other {alerts}} related by ancestry',
    values: { count },
  });

export const CORRELATIONS_SAME_SOURCE_ALERTS = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.correlations.sourceAlerts', {
    defaultMessage: '{count, plural, one {alert} other {alerts}} related by source event',
    values: { count },
  });

export const CORRELATIONS_SESSION_ALERTS = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.correlations.sessionAlerts', {
    defaultMessage: '{count, plural, one {alert} other {alerts}} related by session',
    values: { count },
  });

export const CORRELATIONS_RELATED_CASES = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.correlations.relatedCases', {
    defaultMessage: 'related {count, plural, one {case} other {cases}}',
    values: { count },
  });
