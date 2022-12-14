/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import { AGENT_POLLING_THRESHOLD_MS } from '../../constants';
import type { agentPolicyService } from '../agent_policy';
const DEFAULT_MS_BEFORE_INACTIVE = 10 * 60 * 1000; // 10 minutes
const MISSED_INTERVALS_BEFORE_OFFLINE = 10;
const MS_BEFORE_OFFLINE = MISSED_INTERVALS_BEFORE_OFFLINE * AGENT_POLLING_THRESHOLD_MS;

type InactivityTimeouts = Awaited<ReturnType<typeof agentPolicyService['getInactivityTimeouts']>>;

const _buildInactiveClause = (now: number, inactivityTimeouts: InactivityTimeouts) => {
  const policyClauses = inactivityTimeouts
    .map(({ inactivityTimeout, policyIds }) => {
      const inactivityTimeoutMs = inactivityTimeout * 1000;
      const policyOrs = policyIds
        .map((policyId) => `doc['policy_id'].value == '${policyId}'`)
        .join(' || ');

      return `(${policyOrs}) && lastCheckinMillis < ${now - inactivityTimeoutMs}L`;
    })
    .join(' || ');

  const policyHasNoInactivityTimeout = `lastCheckinMillis < ${now - DEFAULT_MS_BEFORE_INACTIVE}L`;
  const agentIsInactive =
    (policyClauses.length ? `(${policyClauses}) || ` : '') + policyHasNoInactivityTimeout;
  return `lastCheckinMillis > 0 && (${agentIsInactive})`;
};

function _buildSource(inactivityTimeouts: InactivityTimeouts) {
  const now = Date.now();
  return `
    long lastCheckinMillis = doc['last_checkin'].size() > 0 ? doc['last_checkin'].value.toInstant().toEpochMilli() : -1;
    if (doc['unenrolled_at'].size() > 0) { 
        emit('unenrolled'); 
    } else if (${_buildInactiveClause(now, inactivityTimeouts)}) {
        emit('inactive');
    } else if (
        lastCheckinMillis > 0 
        && lastCheckinMillis 
        < (${now - MS_BEFORE_OFFLINE}L)
    ) { 
        emit('offline'); 
    } else if (
      doc['last_checkin_status'].size() > 0 &&
      doc['last_checkin_status'].value.toLowerCase() == 'error'
    ) { 
        emit('error');
    } else if (
      doc['last_checkin_status'].size() > 0 &&
      doc['last_checkin_status'].value.toLowerCase() == 'degraded'
    ) { 
        emit('degraded');
    } else if (
      doc['policy_revision_idx'].size() == 0 || (
        doc['upgrade_started_at'].size() > 0 &&
        doc['upgraded_at'].size() == 0
      )
    ) { 
        emit('updating'); 
    } else if (doc['last_checkin'].size() == 0) {
        emit('enrolling'); 
    } else if (doc['unenrollment_started_at'].size() > 0) {
        emit('unenrolling'); 
    } else { 
        emit('online'); 
    }
    `.replace(/(\n|\s{4})/g, ''); // condense source to single line
}

export function buildStatusRuntimeQuery(
  inactivityTimeouts: InactivityTimeouts
): NonNullable<estypes.SearchRequest['runtime_mappings']> {
  const source = _buildSource(inactivityTimeouts);
  return {
    calculated_status: {
      type: 'keyword',
      script: {
        lang: 'painless',
        source,
      },
    },
  };
}
