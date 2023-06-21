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

export const CORRELATIONS_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlationsText',
  {
    defaultMessage: 'fields of correlation',
  }
);

export const CORRELATIONS_ANCESTRY_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.ancestryAlert',
  {
    defaultMessage: 'alert related by ancestry',
  }
);

export const CORRELATIONS_ANCESTRY_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.ancestryAlerts',
  {
    defaultMessage: 'alerts related by ancestry',
  }
);
export const CORRELATIONS_SAME_SOURCE_EVENT_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSourceEventAlert',
  {
    defaultMessage: 'alert related by the same source event',
  }
);

export const CORRELATIONS_SAME_SOURCE_EVENT_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSourceEventAlerts',
  {
    defaultMessage: 'alerts related by the same source event',
  }
);
export const CORRELATIONS_SAME_SESSION_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSessionAlert',
  {
    defaultMessage: 'alert related by session',
  }
);

export const CORRELATIONS_SAME_SESSION_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSessionAlerts',
  {
    defaultMessage: 'alerts related by session',
  }
);
export const CORRELATIONS_RELATED_CASE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.relatedCase',
  {
    defaultMessage: 'related case',
  }
);

export const CORRELATIONS_RELATED_CASES = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.relatedCases',
  {
    defaultMessage: 'related cases',
  }
);
