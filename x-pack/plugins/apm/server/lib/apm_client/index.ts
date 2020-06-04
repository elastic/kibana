/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { ESSearchBody } from '../../../typings/elasticsearch';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

// TODO: should we use ApmIndicesConfig here instead of these custom names?
type Index = 'transaction' | 'span' | 'error' | 'metrics';

interface Search {
  apmIndices: Index[];
  body: ESSearchBody;
}

interface ApmClient {
  search: (params: Search) => void;
}

const indexMap: Record<Index, keyof ApmIndicesConfig> = {
  transaction: 'apm_oss.transactionIndices',
  error: 'apm_oss.errorIndices',
  span: 'apm_oss.spanIndices',
  metrics: 'apm_oss.metricsIndices',
};

export let apmClient: ApmClient = {
  search() {
    throw new Error("apmClient wasn't initialized");
  },
};
export function createApmClient(core: CoreSetup) {
  apmClient = {
    search: async ({ apmIndices, body }: Search) => {
      const indices = apmIndices.map((index: Index) => indexMap[index]);
      // TODO: callAsCurrentUser isn't available here. How to get it?
      const { callAsInternalUser } = core.elasticsearch.legacy.client;
      const res = await callAsInternalUser('search', { index: indices, body });
      return res;
    },
  };
}
