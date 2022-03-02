/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';
export const VIZ_INSPECT_BUTTON = '[data-test-subj="viz-actions-inspect"]';

export interface InspectButtonMetadata {
  altInspectId?: string;
  id: string;
  title: string;
  tabId?: string;
}

export const VIZ_ACTIONS_HOSTS_DETAILS_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-authenticationsSuccess-metric"]',
    title: 'Unique IPs Stat - Success',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-authenticationsFailure-metric"]',
    title: 'Unique IPs Stat - Failure',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-bar_horizontal_stacked"]',
    title: 'User authentication - bar',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-area"]',
    title: 'User authentication - area',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-uniqueSourceIps-metric"]',
    title: 'Unique IPs - source',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-uniqueDestinationIps-metric"]',
    title: 'Unique IPs - destination',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-bar_horizontal_stacked"]',
    title: 'Unique IPs - bar',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-area"]',
    title: 'Unique IPs - area',
  },
  {
    id: '[data-test-subj="stat-authenticationsHistogramQuery"]',
    title: 'Authentications histogram',
    tabId: '[data-test-subj="navigation-authentications"]',
  },
  {
    id: '[data-test-subj="stat-eventsHistogramQuery"]',
    title: 'Events histogram',
    tabId: '[data-test-subj="navigation-events"]',
  },
  {
    id: '[data-test-subj="stat-alertsHistogramQuery"]',
    title: 'External alert trend histogram',
    tabId: '[data-test-subj="navigation-externalAlerts"]',
  },
];

export const VIZ_ACTIONS_HOSTS_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-hostsKpiHostsQuery-hosts-metric"]',
    title: 'Hosts Stat',
  },
  {
    id: '[data-test-subj="stat-hostsKpiHostsQuery-area"]',
    title: 'Hosts Stat - area',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-authenticationsSuccess-metric"]',
    title: 'Unique IPs Stat - Success',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-authenticationsFailure-metric"]',
    title: 'Unique IPs Stat - Failure',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-bar_horizontal_stacked"]',
    title: 'User authentication - bar',
  },
  {
    id: '[data-test-subj="stat-hostsKpiAuthenticationsQuery-area"]',
    title: 'User authentication - area',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-uniqueSourceIps-metric"]',
    title: 'Unique IPs - source',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-uniqueDestinationIps-metric"]',
    title: 'Unique IPs - destination',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-bar_horizontal_stacked"]',
    title: 'Unique IPs - bar',
  },
  {
    id: '[data-test-subj="stat-hostsKpiUniqueIpsQuery-area"]',
    title: 'Unique IPs - area',
  },
  {
    id: '[data-test-subj="stat-authenticationsHistogramQuery"]',
    title: 'Authentications histogram',
    tabId: '[data-test-subj="navigation-authentications"]',
  },
  {
    id: '[data-test-subj="stat-eventsHistogramQuery"]',
    title: 'Events histogram',
    tabId: '[data-test-subj="navigation-events"]',
  },
  {
    id: '[data-test-subj="stat-alertsHistogramQuery"]',
    title: 'External alert trend histogram',
    tabId: '[data-test-subj="navigation-externalAlerts"]',
  },
];

export const INSPECT_HOSTS_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="table-allHosts-loading-false"]',
    title: 'All Hosts Table',
    tabId: '[data-test-subj="navigation-allHosts"]',
  },
  {
    id: '[data-test-subj="table-authentications-loading-false"]',
    title: 'Authentications Table',
    tabId: '[data-test-subj="navigation-authentications"]',
  },
  {
    id: '[data-test-subj="table-uncommonProcesses-loading-false"]',
    title: 'Uncommon processes Table',
    tabId: '[data-test-subj="navigation-uncommonProcesses"]',
  },
  {
    altInspectId: `[data-test-subj="events-viewer-panel"] ${INSPECT_BUTTON_ICON}`,
    id: '[data-test-subj="events-container-loading-false"]',
    title: 'Events Table',
    tabId: '[data-test-subj="navigation-events"]',
  },
];

export const VIZ_ACTIONS_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-networkKpiNetworkEventsQuery-networkEvents-metric"]',
    title: 'Inspect KPI Network events',
  },
  {
    id: '[data-test-subj="stat-networkKpiDnsQuery-dnsQueries-metric"]',
    title: 'Inspect KPI DNS queries',
  },
  {
    id: '[data-test-subj="stat-networkKpiUniqueFlowsQuery-uniqueFlowId-metric"]',
    title: 'Inspect KPI Unique flow IDs',
  },
  {
    id: '[data-test-subj="stat-networkKpiTlsHandshakesQuery-tlsHandshakes-metric"]',
    title: 'Inspect KPI TLS handshakes',
  },
  {
    id: '[data-test-subj="stat-networkKpiUniquePrivateIpsQuery-uniqueSourcePrivateIps-metric"]',
    title: 'Inspect KPI Unique private IPs - source',
  },
  {
    id: '[data-test-subj="stat-networkKpiUniquePrivateIpsQuery-uniqueDestinationPrivateIps-metric"]',
    title: 'Inspect KPI Unique private IPs - dest.',
  },
  {
    id: '[data-test-subj="stat-networkKpiUniquePrivateIpsQuery-bar_horizontal_stacked"]',
    title: 'Inspect KPI Unique private IPs - bar chart',
  },
  {
    id: '[data-test-subj="stat-networkKpiUniquePrivateIpsQuery-area"]',
    title: 'Inspect KPI Unique private IPs - area chart',
  },
];

export const INSPECT_NETWORK_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="table-topNFlowSource-loading-false"]',
    title: 'Source IPs Table',
  },
  {
    id: '[data-test-subj="table-topNFlowDestination-loading-false"]',
    title: 'Destination IPs Table',
  },
  {
    id: '[data-test-subj="table-dns-loading-false"]',
    title: 'Top DNS Domains Table',
    tabId: '[data-test-subj="navigation-dns"]',
  },
];
