/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.hosts.pageTitle', {
  defaultMessage: 'Hosts',
});

export const NAVIGATION_ALL_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.allHostsTitle',
  {
    defaultMessage: 'All hosts',
  }
);

export const NAVIGATION_AUTHENTICATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.authenticationsTitle',
  {
    defaultMessage: 'Authentications',
  }
);

export const NAVIGATION_UNCOMMON_PROCESSES_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.uncommonProcessesTitle',
  {
    defaultMessage: 'Uncommon processes',
  }
);

export const NAVIGATION_ANOMALIES_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.anomaliesTitle',
  {
    defaultMessage: 'Anomalies',
  }
);

export const NAVIGATION_EVENTS_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.eventsTitle',
  {
    defaultMessage: 'Events',
  }
);

export const NAVIGATION_HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.hostRiskTitle',
  {
    defaultMessage: 'Host risk',
  }
);

export const NAVIGATION_SESSIONS_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.sessionsTitle',
  {
    defaultMessage: 'Sessions',
  }
);

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.matrixHistogram.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

export const VIEW_DASHBOARD_BUTTON = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.hostRisk.viewDashboardButtonLabel',
  {
    defaultMessage: 'View source dashboard',
  }
);

export const HOST_RISK_SCORE_OVER_TIME = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.hostScoreOverTimeTitle',
  {
    defaultMessage: 'Host risk score over time',
  }
);
