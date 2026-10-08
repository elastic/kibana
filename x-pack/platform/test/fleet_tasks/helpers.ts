/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
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

  // Refresh first so the status-change task's just-committed last_known_status writes are searchable: the suite gates teardown on a realtime GET, which can observe a write before refresh, so without this the delete's search snapshots a stale version and aborts on conflict, leaving active agents that make the policy delete 400.
  await es.indices.refresh({ index: AGENTS_INDEX, ignore_unavailable: true });
  await es.deleteByQuery({
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    refresh: true,
    conflicts: 'proceed',
    query: {
      match_all: {},
    },
  });
}
