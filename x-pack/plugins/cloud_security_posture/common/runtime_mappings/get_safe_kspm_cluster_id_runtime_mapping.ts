/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';

/**
 * Creates the `safe_posture_type` runtime field with the value of either
 * `kspm` or `cspm` based on the value of `rule.benchmark.posture_type`
 */
export const getSafeKspmClusterIdRuntimeMapping = (): MappingRuntimeFields => ({
  safe_kspm_cluster_id: {
    type: 'keyword',
    script: {
      source: `
        def orchestratorIdAvailable = doc.containsKey("orchestrator.cluster.id") &&
          !doc["orchestrator.cluster.id"].empty;
        def clusterIdAvailable = doc.containsKey("cluster_id") &&
          !doc["cluster_id"].empty;
          
        if (orchestratorIdAvailable) {
          emit(doc["orchestrator.cluster.id"].value);
        } else if (clusterIdAvailable) {
          emit(doc["cluster_id"].value);
        }
      `,
    },
  },
});
