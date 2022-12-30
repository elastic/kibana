/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLLING_THRESHOLD_MS } from '../constants';

function buildKueryForEnrollingAgents(path: string = ''): string {
  return `not (${path}last_checkin:*)`;
}

function buildKueryForUnenrollingAgents(path: string = ''): string {
  return `${path}unenrollment_started_at:*`;
}

function buildKueryForUnenrolledAgents(path: string = ''): string {
  return `${path}unenrolled_at:*`; // active:false
}

function buildKueryForOnlineAgents(path: string = ''): string {
  return `${path}last_checkin:* ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForUpdatingAgents, buildKueryForErrorAgents],
    path
  )}`;
}

function buildKueryForErrorAgents(path: string = ''): string {
  return `(${path}last_checkin_status:error or ${path}last_checkin_status:degraded or ${path}last_checkin_status:DEGRADED or ${path}last_checkin_status:ERROR) ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForUnenrollingAgents],
    path
  )}`;
}

const offlineTimeoutIntervalCount = 10; // 30s*10 = 5m timeout

function buildKueryForOfflineAgents(path: string = ''): string {
  return `${path}last_checkin < now-${
    (offlineTimeoutIntervalCount * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}

function buildKueryForUpgradingAgents(path: string = ''): string {
  return `(${path}upgrade_started_at:*) and not (${path}upgraded_at:*)`;
}

function buildKueryForUpdatingAgents(path: string = ''): string {
  return `((${buildKueryForUpgradingAgents(path)}) or (${buildKueryForEnrollingAgents(
    path
  )}) or (${buildKueryForUnenrollingAgents(
    path
  )}) or (not ${path}policy_revision_idx:*)) ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForErrorAgents],
    path
  )}`;
}

function buildKueryForInactiveAgents(path: string = '') {
  return `${path}active:false`; // inactive timeout
}

function addExclusiveKueryFilter(kueryBuilders: Array<(path?: string) => string>, path?: string) {
  return ` AND not (${kueryBuilders
    .map((kueryBuilder) => `(${kueryBuilder(path)})`)
    .join(' or ')})`;
}

export function replaceStatusWithFilters(kuery: string): string {
  if (kuery.includes('status:online')) {
    kuery = kuery.replace('status:online', buildKueryForOnlineAgents());
  }
  if (kuery.includes('status:error or status:degraded')) {
    kuery = kuery.replace('status:error or status:degraded', buildKueryForErrorAgents());
  }
  if (kuery.includes('status:updating or status:unenrolling or status:enrolling')) {
    kuery = kuery.replace(
      'status:updating or status:unenrolling or status:enrolling',
      buildKueryForUpdatingAgents()
    );
  }
  if (kuery.includes('status:offline')) {
    kuery = kuery.replace('status:offline', buildKueryForOfflineAgents());
  }
  if (kuery.includes('status:inactive')) {
    kuery = kuery.replace('status:inactive', buildKueryForInactiveAgents());
  }
  if (kuery.includes('status:unenrolled')) {
    kuery = kuery.replace('status:unenrolled', buildKueryForUnenrolledAgents());
  }
  return kuery;
}
