/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACEHOLDER = i18n.translate('xpack.securitySolution.hosts.kqlPlaceholder', {
  defaultMessage: 'e.g. host.name: "foo"',
});

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

export const NAVIGATION_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.alertsTitle',
  {
    defaultMessage: 'External alerts',
  }
);

export const NAVIGATION_HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.hosts.navigation.hostRisk',
  {
    defaultMessage: 'Risk Score',
  }
);

export const ERROR_FETCHING_AUTHENTICATIONS_DATA = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.matrixHistogram.errorFetchingAuthenticationsData',
  {
    defaultMessage: 'Failed to query authentications data',
  }
);

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.matrixHistogram.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

export const EVENTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.hosts.navigaton.eventsUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

export const VIEW_DASHBOARD_BUTTON = i18n.translate(
  'xpack.securitySolution.hosts.navigaton.hostRisk.viewDashboardButtonLabel',
  {
    defaultMessage: 'View source dashboard',
  }
);

export const HOST_RISK_CLASSIFICATION = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskClassificationTitle',
  {
    defaultMessage: 'Host risk classification',
  }
);

export const HOST_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskToolTip',
  {
    defaultMessage:
      'Host risk classifcation is determined by host risk score. Hosts classified as Critical or High are indicated as risky.',
  }
);

export const HOST_NAME = i18n.translate('xpack.securitySolution.hostsRiskTable.hostNameTitle', {
  defaultMessage: 'Host Name',
});

export const HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskScoreTitle',
  {
    defaultMessage: 'Host risk score',
  }
);

export const HOST_RISK = i18n.translate('xpack.securitySolution.hostsRiskTable.tabTitle', {
  defaultMessage: 'Host risk',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.hostsRiskTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {host} other {hosts}}`,
  });

export const ROWS = (numRows: number) =>
  i18n.translate('xpack.securitySolution.hostsRiskTable.rows', {
    values: { numRows },
    defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
  });
