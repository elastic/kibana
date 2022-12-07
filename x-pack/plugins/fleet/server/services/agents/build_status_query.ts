/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLLING_THRESHOLD_MS } from '../../constants';

const DEFAULT_MS_BEFORE_INCACTIVE = 10 * 60 * 1000; // 10 minutes
const DEFAULT_INACTIVE_CLAUSE = `lastCheckinMillis < ${Date.now() - DEFAULT_MS_BEFORE_INCACTIVE}L`;
const MISSED_INTERVALS_BEFORE_OFFLINE = 10;
const MS_BEFORE_OFFLINE = MISSED_INTERVALS_BEFORE_OFFLINE * AGENT_POLLING_THRESHOLD_MS;
const _buildInactiveClause = (
  now: number,
  unenrollTimeouts: Array<{ policy_ids: string[]; unenroll_timeout: number }>
) => {
  const policyClauses = unenrollTimeouts.map((unenrollTimeout) => {
    const policyOrs = unenrollTimeout.policy_ids
      .map((policyId) => `doc['policy_id'].value == '${policyId}'`)
      .join(' || ');

    return `(${policyOrs}) && lastCheckinMillis < ${now - unenrollTimeout.unenroll_timeout}L`;
  });
  const allClauses = [...policyClauses, DEFAULT_INACTIVE_CLAUSE];

  return `${allClauses.join(' || ')}`;
};

function _buildSource(unenrollTimeouts: Array<{ policy_ids: string[]; unenroll_timeout: number }>) {
  const now = Date.now();

  return `
    long lastCheckinMillis = doc['last_checkin'].value.toInstant().toEpochMilli();
    if (doc['unenrolled_at'].size() > 0) { 
        emit('unenrolled'); 
    } else if (${_buildInactiveClause(now, unenrollTimeouts)}) {
        emit('inactive');
    } else if (
        doc['last_checkin'].size() > 0 
        && lastCheckinMillis 
        < (${now - MS_BEFORE_OFFLINE}L)
    ) { 
        emit('offline'); 
    } else if (
        doc['last_checkin_status'].value.toLowerCase() == 'error' 
        || doc['last_checkin_status'].value.toLowerCase() == 'degraded'
    ) { 
        emit('unhealthy'); 
    } else if (
        doc['upgrade_started_at'].size() > 0 
        && doc['upgraded_at'].size() == 0
    ) { 
        emit('updating'); 
    } else if (doc['last_checkin'].size() == 0) {
        emit('updating'); 
    } else if (doc['unenrollment_started_at'].size() > 0) {
        emit('updating'); 
    } else if (doc['policy_revision_idx'].size() == 0) {
        emit('updating');
    } else if (doc['last_checkin'].size() > 0) {
        emit('healthy');
    } else { 
        emit('unknown'); 
    }
    `.replace(/(\n|\s{4})/g, ''); // remove newlines and 4 spaces from the source
}

export function buildStatusRuntimeQuery(
  unenrollTimeouts: Array<{ policy_ids: string[]; unenroll_timeout: number }>
) {
  const source = _buildSource(unenrollTimeouts);
  return {
    runtime_mappings: {
      status: {
        type: 'boolean',
        script: {
          lang: 'painless',
          source,
        },
      },
    },
  };
}
