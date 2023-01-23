/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { AGENT_POLLING_THRESHOLD_MS } from '../../constants';
import { agentPolicyService } from '../agent_policy';
const MISSED_INTERVALS_BEFORE_OFFLINE = 10;
const MS_BEFORE_OFFLINE = MISSED_INTERVALS_BEFORE_OFFLINE * AGENT_POLLING_THRESHOLD_MS;

export type InactivityTimeouts = Awaited<
  ReturnType<typeof agentPolicyService['getInactivityTimeouts']>
>;

const _buildInactiveClause = (
  now: number,
  inactivityTimeouts: InactivityTimeouts,
  field: (path: string) => string
) => {
  const policyClauses = inactivityTimeouts
    .map(({ inactivityTimeout, policyIds }) => {
      const inactivityTimeoutMs = inactivityTimeout * 1000;
      const policyOrs = policyIds
        .map((policyId) => `${field('policy_id')}.value == '${policyId}'`)
        .join(' || ');

      return `(${policyOrs}) && lastCheckinMillis < ${now - inactivityTimeoutMs}L`;
    })
    .join(' || ');

  const agentIsInactive = policyClauses.length ? `${policyClauses}` : 'false'; // if no policies have inactivity timeouts, then no agents are inactive

  return `lastCheckinMillis > 0 && ${field('policy_id')}.size() > 0 && ${agentIsInactive}`;
};

function _buildSource(inactivityTimeouts: InactivityTimeouts, pathPrefix?: string) {
  const normalizedPrefix = pathPrefix ? `${pathPrefix}${pathPrefix.endsWith('.') ? '' : '.'}` : '';
  const field = (path: string) => `doc['${normalizedPrefix + path}']`;
  const now = Date.now();
  return `
    long lastCheckinMillis = ${field('last_checkin')}.size() > 0 
      ? ${field('last_checkin')}.value.toInstant().toEpochMilli() 
      : -1;
    if (${field('active')}.size() > 0 && ${field('active')}.value == false) {
      emit('unenrolled'); 
    } else if (${_buildInactiveClause(now, inactivityTimeouts, field)}) {
      emit('inactive');
    } else if (
        lastCheckinMillis > 0 
        && lastCheckinMillis 
        < (${now - MS_BEFORE_OFFLINE}L)
    ) { 
      emit('offline'); 
    } else if (
      ${field('policy_revision_idx')}.size() == 0 || (
        ${field('upgrade_started_at')}.size() > 0 &&
        ${field('upgraded_at')}.size() == 0
      )
    ) { 
      emit('updating'); 
    } else if (${field('last_checkin')}.size() == 0) {
      emit('enrolling'); 
    } else if (${field('unenrollment_started_at')}.size() > 0) {
      emit('unenrolling'); 
    } else if (
      ${field('last_checkin_status')}.size() > 0 &&
      ${field('last_checkin_status')}.value.toLowerCase() == 'error'
    ) { 
        emit('error');
    } else if (
      ${field('last_checkin_status')}.size() > 0 &&
      ${field('last_checkin_status')}.value.toLowerCase() == 'degraded'
    ) { 
      emit('degraded');
    } else { 
      emit('online'); 
    }`;
}

// exported for testing
export function _buildStatusRuntimeField(
  inactivityTimeouts: InactivityTimeouts,
  pathPrefix?: string
): NonNullable<estypes.SearchRequest['runtime_mappings']> {
  const source = _buildSource(inactivityTimeouts, pathPrefix);
  return {
    status: {
      type: 'keyword',
      script: {
        lang: 'painless',
        source,
      },
    },
  };
}

// Build the runtime field to return the agent status
// pathPrefix is used to prefix the field path in the source
// pathPrefix is used by the endpoint team currently to run
// agent queries against the endpoint metadata index
export async function buildAgentStatusRuntimeField(
  soClient: SavedObjectsClientContract,
  pathPrefix?: string
) {
  const inactivityTimeouts = await agentPolicyService.getInactivityTimeouts(soClient);

  return _buildStatusRuntimeField(inactivityTimeouts, pathPrefix);
}
