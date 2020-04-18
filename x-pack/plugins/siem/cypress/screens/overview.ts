/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Host Stats
export const STAT_AUDITD = {
  value: '123',
  domId: '[data-test-subj="host-stat-auditbeatAuditd"]',
};
export const ENDGAME_DNS = {
  value: '391',
  domId: '[data-test-subj="host-stat-endgameDns"]',
};
export const ENDGAME_FILE = {
  value: '392',
  domId: '[data-test-subj="host-stat-endgameFile"]',
};
export const ENDGAME_IMAGE_LOAD = {
  value: '393',
  domId: '[data-test-subj="host-stat-endgameImageLoad"]',
};
export const ENDGAME_NETWORK = {
  value: '394',
  domId: '[data-test-subj="host-stat-endgameNetwork"]',
};
export const ENDGAME_PROCESS = {
  value: '395',
  domId: '[data-test-subj="host-stat-endgameProcess"]',
};
export const ENDGAME_REGISTRY = {
  value: '396',
  domId: '[data-test-subj="host-stat-endgameRegistry"]',
};
export const ENDGAME_SECURITY = {
  value: '397',
  domId: '[data-test-subj="host-stat-endgameSecurity"]',
};
export const STAT_FILEBEAT = {
  value: '890',
  domId: '[data-test-subj="host-stat-filebeatSystemModule"]',
};
export const STAT_FIM = {
  value: '345',
  domId: '[data-test-subj="host-stat-auditbeatFIM"]',
};
export const STAT_LOGIN = {
  value: '456',
  domId: '[data-test-subj="host-stat-auditbeatLogin"]',
};
export const STAT_PACKAGE = {
  value: '567',
  domId: '[data-test-subj="host-stat-auditbeatPackage"]',
};
export const STAT_PROCESS = {
  value: '678',
  domId: '[data-test-subj="host-stat-auditbeatProcess"]',
};
export const STAT_USER = {
  value: '789',
  domId: '[data-test-subj="host-stat-auditbeatUser"]',
};
export const STAT_WINLOGBEAT_SECURITY = {
  value: '70',
  domId: '[data-test-subj="host-stat-winlogbeatSecurity"]',
};
export const STAT_WINLOGBEAT_MWSYSMON_OPERATIONAL = {
  value: '30',
  domId: '[data-test-subj="host-stat-winlogbeatMWSysmonOperational"]',
};

export const HOST_STATS = [
  STAT_AUDITD,
  ENDGAME_DNS,
  ENDGAME_FILE,
  ENDGAME_IMAGE_LOAD,
  ENDGAME_NETWORK,
  ENDGAME_PROCESS,
  ENDGAME_REGISTRY,
  ENDGAME_SECURITY,
  STAT_FILEBEAT,
  STAT_FIM,
  STAT_LOGIN,
  STAT_PACKAGE,
  STAT_PROCESS,
  STAT_USER,
  STAT_WINLOGBEAT_SECURITY,
  STAT_WINLOGBEAT_MWSYSMON_OPERATIONAL,
];

// Network Stats
export const STAT_SOCKET = {
  value: '578,502',
  domId: '[data-test-subj="network-stat-auditbeatSocket"]',
};
export const STAT_CISCO = {
  value: '999',
  domId: '[data-test-subj="network-stat-filebeatCisco"]',
};
export const STAT_NETFLOW = {
  value: '2,544',
  domId: '[data-test-subj="network-stat-filebeatNetflow"]',
};
export const STAT_PANW = {
  value: '678',
  domId: '[data-test-subj="network-stat-filebeatPanw"]',
};
export const STAT_SURICATA = {
  value: '303,699',
  domId: '[data-test-subj="network-stat-filebeatSuricata"]',
};
export const STAT_ZEEK = {
  value: '71,129',
  domId: '[data-test-subj="network-stat-filebeatZeek"]',
};
export const STAT_DNS = {
  value: '1,090',
  domId: '[data-test-subj="network-stat-packetbeatDNS"]',
};
export const STAT_FLOW = {
  value: '722,153',
  domId: '[data-test-subj="network-stat-packetbeatFlow"]',
};
export const STAT_TLS = {
  value: '340',
  domId: '[data-test-subj="network-stat-packetbeatTLS"]',
};

export const NETWORK_STATS = [
  STAT_SOCKET,
  STAT_CISCO,
  STAT_NETFLOW,
  STAT_PANW,
  STAT_SURICATA,
  STAT_ZEEK,
  STAT_DNS,
  STAT_FLOW,
  STAT_TLS,
];

export const OVERVIEW_HOST_STATS = '[data-test-subj="overview-hosts-stats"]';

export const OVERVIEW_NETWORK_STATS = '[data-test-subj="overview-network-stats"]';
