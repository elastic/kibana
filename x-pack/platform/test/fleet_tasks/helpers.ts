/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_INDEX, AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../api_integration/ftr_provider_context';

export async function createAgentDoc(
  providerContext: FtrProviderContext,
  id: string,
  policyId: string,
  version: string,
  active: boolean = true,
  additionalData: any = {}
) {
  const { getService } = providerContext;
  const es = getService('es');
  const lastCheckin = active
    ? new Date().toISOString()
    : new Date(new Date().getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(); // 3 weeks ago

  await es.index({
    index: AGENTS_INDEX,
    id,
    document: {
      id,
      type: 'PERMANENT',
      active: true,
      enrolled_at: new Date().toISOString(),
      last_checkin: lastCheckin,
      policy_id: policyId,
      policy_revision: 1,
      policy_revision_idx: 1,
      agent: {
        id,
        version,
      },
      local_metadata: {
        elastic: {
          agent: {
            version,
            upgradeable: true,
          },
        },
      },
      ...additionalData,
    },
    refresh: 'wait_for',
  });
}

export async function cleanupAgentDocs(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  try {
    await es.deleteByQuery({
      index: AGENTS_INDEX,
      refresh: true,
      query: {
        match_all: {},
      },
    });
  } catch (err) {
    // index doesn't exist
  }
}

async function createPolicyRevision(
  providerContext: FtrProviderContext,
  policyId: string,
  revisionIdx: number
) {
  const { getService } = providerContext;
  const es = getService('es');

  const doc = {
    '@timestamp': new Date().toISOString(),
    policy_id: policyId,
    revision_idx: revisionIdx,
    data: {
      id: policyId,
      name: `Test Policy ${policyId}`,
      namespace: 'default',
      revision: revisionIdx,
      agent_features: [],
      inputs: [],
    },
  };

  await es.index({
    index: AGENT_POLICY_INDEX,
    id: `${policyId}:${revisionIdx}`,
    document: doc,
    refresh: 'wait_for',
  });
}

export async function createPolicyRevisions(
  providerContext: FtrProviderContext,
  policyId: string,
  count: number
) {
  const promises = [];
  for (let i = 1; i <= count; i++) {
    promises.push(createPolicyRevision(providerContext, policyId, 1 + i));
  }
  await Promise.all(promises);
}

export async function getPolicyRevisions(providerContext: FtrProviderContext, policyId: string) {
  const { getService } = providerContext;
  const es = getService('es');

  const result = await es.search({
    index: AGENT_POLICY_INDEX,
    query: {
      term: {
        policy_id: policyId,
      },
    },
    sort: [{ revision_idx: { order: 'asc' } }],
    size: 1000,
  });
  return result.hits.hits.map((hit: any) => ({
    id: hit._id,
    revision_idx: hit._source.revision_idx,
  }));
}

export async function cleanupPolicyRevisions(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  await es.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    refresh: true,
    query: {
      match_all: {},
    },
  });
}
