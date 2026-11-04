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
  const retry = getService('retry');

  // The pre-delete refresh only covers writes that land before the delete's search snapshot, so
  // `conflicts: 'proceed'` still skips any doc Fleet's background tasks update *during* it, without
  // an error. Re-issue the idempotent delete until the index is empty: a survivor makes the suite's
  // policy delete 400 and leaks a version-conditioned policy into later suites.
  await retry.waitForWithTimeout(`${AGENTS_INDEX} to be empty`, 30_000, async () => {
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
    const { count } = await es.count({ index: AGENTS_INDEX, ignore_unavailable: true });
    return count === 0;
  });
}
