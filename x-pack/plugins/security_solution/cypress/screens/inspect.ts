/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';

export interface InspectButtonMetadata {
  altInspectId?: string;
  id: string;
  title: string;
  tabId?: string;
}

export const INSPECT_HOSTS_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-hosts"]',
    title: 'Hosts Stat',
  },
  {
    id: '[data-test-subj="stat-authentication"]',
    title: 'User Authentications Stat',
  },
  {
    id: '[data-test-subj="stat-uniqueIps"]',
    title: 'Unique IPs Stat',
  },
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

export const INSPECT_NETWORK_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-networkEvents"]',
    title: 'Network events Stat',
  },
  {
    id: '[data-test-subj="stat-dnsQueries"]',
    title: 'DNS queries Stat',
  },
  {
    id: '[data-test-subj="stat-uniqueFlowId"]',
    title: 'Unique flow IDs Stat',
  },
  {
    id: '[data-test-subj="stat-tlsHandshakes"]',
    title: 'TLS handshakes Stat',
  },
  {
    id: '[data-test-subj="stat-UniqueIps"]',
    title: 'Unique private IPs Stat',
  },
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
