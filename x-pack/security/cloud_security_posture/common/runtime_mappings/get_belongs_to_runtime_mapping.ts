/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';

/**
 * Creates the `belongs_to` runtime field with the value of either
 * `account.cloud.name` or `cluster.id` based on the value of `rule.benchmark.posture_type`
 */
export const getBelongsToRuntimeMapping = (): MappingRuntimeFields => ({
  belongs_to: {
    type: 'keyword',
    script: {
      source: `
        def postureTypeAvailable = doc.containsKey("rule.benchmark.posture_type") &&
          !doc["rule.benchmark.posture_type"].empty;
        def orchestratorIdAvailable = doc.containsKey("orchestrator.cluster.id") &&
          !doc["orchestrator.cluster.id"].empty;

        if (!postureTypeAvailable) {
          def belongs_to = orchestratorIdAvailable ?
            doc["orchestrator.cluster.id"].value : doc["cluster_id"].value;
          emit(belongs_to);
        } else {
          def policy_template_type = doc["rule.benchmark.posture_type"].value;

          if (policy_template_type == "cspm") {
            def belongs_to = doc["cloud.account.name"].value;
            emit(belongs_to);
          } else if (policy_template_type == "kspm") {
            def belongs_to = orchestratorIdAvailable ?
              doc["orchestrator.cluster.id"].value : doc["cluster_id"].value;
            emit(belongs_to);
          } else {
            // Default behaviour when policy_template_type is unknown
            def belongs_to = orchestratorIdAvailable ?
              doc["orchestrator.cluster.id"].value : doc["cluster_id"].value;
            emit(belongs_to);
          }
        }
      `,
    },
  },
});
