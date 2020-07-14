/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACEHOLDER = i18n.translate('xpack.securitySolution.network.kqlPlaceholder', {
  defaultMessage: 'e.g. source.ip: "foo"',
});

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.network.pageTitle', {
  defaultMessage: 'Network',
});

export const NAVIGATION_FLOWS_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.flowsTitle',
  {
    defaultMessage: 'Flows',
  }
);

export const NAVIGATION_DNS_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.dnsTitle',
  {
    defaultMessage: 'DNS',
  }
);

export const ERROR_FETCHING_DNS_DATA = i18n.translate(
  'xpack.securitySolution.hosts.navigation.dns.histogram.errorFetchingDnsData',
  {
    defaultMessage: 'Failed to query DNS data',
  }
);

export const NAVIGATION_TLS_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.tlsTitle',
  {
    defaultMessage: 'TLS',
  }
);

export const NAVIGATION_HTTP_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.httpTitle',
  {
    defaultMessage: 'HTTP',
  }
);

export const NAVIGATION_ANOMALIES_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.anomaliesTitle',
  {
    defaultMessage: 'Anomalies',
  }
);

export const NAVIGATION_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.network.navigation.alertsTitle',
  {
    defaultMessage: 'External alerts',
  }
);

export const DOMAINS_COUNT_BY = (groupByField: string) =>
  i18n.translate('xpack.securitySolution.network.dns.stackByUniqueSubdomain', {
    values: { groupByField },
    defaultMessage: 'Top domains by {groupByField}',
  });
