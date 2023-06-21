/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSIGHTS = i18n.translate('xpack.securitySolution.alertDetails.overview.insights', {
  defaultMessage: 'Insights',
});

export const PROCESS_ANCESTRY = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_process_ancestry',
  {
    defaultMessage: 'Related alerts by process ancestry',
  }
);

export const PROCESS_ANCESTRY_COUNT = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_process_ancestry_count',
    {
      defaultMessage: '{count} {count, plural, =1 {alert} other {alerts}} by process ancestry',
      values: { count },
    }
  );

export const PROCESS_ANCESTRY_ERROR = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_process_ancestry_error',
  {
    defaultMessage: 'Failed to fetch alerts.',
  }
);

export const PROCESS_ANCESTRY_FILTER = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.processAncestryFilter',
  {
    defaultMessage: 'Process Ancestry Alert IDs',
  }
);

export const PROCESS_ANCESTRY_EMPTY = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_process_ancestry_empty',
  {
    defaultMessage: 'There are no related alerts by process ancestry.',
  }
);

export const SESSION_LOADING = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_source_event_loading',
  { defaultMessage: 'Loading related alerts by source event' }
);

export const SESSION_ERROR = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_session_error',
  {
    defaultMessage: 'Failed to load related alerts by session',
  }
);

export const SESSION_EMPTY = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_session_empty',
  {
    defaultMessage: 'There are no related alerts by session',
  }
);

export const SESSION_COUNT = (count?: number) =>
  i18n.translate(
    'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_session_count',
    {
      defaultMessage: '{count} {count, plural, =1 {alert} other {alerts}} related by session',
      values: { count },
    }
  );
export const SOURCE_EVENT_LOADING = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_source_event_loading',
  { defaultMessage: 'Loading related alerts by source event' }
);

export const SOURCE_EVENT_ERROR = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_source_event_error',
  {
    defaultMessage: 'Failed to load related alerts by source event',
  }
);

export const SOURCE_EVENT_EMPTY = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_alerts_by_source_event_empty',
  {
    defaultMessage: 'There are no related alerts by source event',
  }
);

export const SOURCE_EVENT_COUNT = (count?: number) =>
  i18n.translate(
    'xpack.securitySolution.alertDetails.overview.insights_related_alerts_by_source_event_count',
    {
      defaultMessage: '{count} {count, plural, =1 {alert} other {alerts}} related by source event',
      values: { count },
    }
  );

export const CASES_LOADING = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_cases_loading',
  {
    defaultMessage: 'Loading related cases',
  }
);

export const CASES_ERROR = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.related_cases_error',
  {
    defaultMessage: 'Failed to load related cases',
  }
);

export const CASES_COUNT = (count: number) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.insights.related_cases_count', {
    defaultMessage: '{count} {count, plural, =1 {case} other {cases}} related to this alert',
    values: { count },
  });

export const CASES_ERROR_TOAST = (error: string) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.insights.relatedCasesFailure', {
    defaultMessage: 'Unable to load related cases: "{error}"',
    values: { error },
  });

export const SIMPLE_ALERT_TABLE_ERROR = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.simpleAlertTable.error',
  {
    defaultMessage: 'Failed to load the alerts.',
  }
);

export const SIMPLE_ALERT_TABLE_LIMITED = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.limitedAlerts',
  {
    defaultMessage: 'Showing only the latest 10 alerts. View the rest of alerts in timeline.',
  }
);

export const INSIGHTS_UPSELL = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.alertUpsellTitle',
  {
    defaultMessage: 'Get more insights with a platinum subscription',
  }
);

export const SUPPRESSED_ALERTS_COUNT = (count?: number) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.insights.suppressedAlertsCount', {
    defaultMessage: '{count} suppressed {count, plural, =1 {alert} other {alerts}}',
    values: { count },
  });

export const SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.insights.suppressedAlertsCountTechnicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);
