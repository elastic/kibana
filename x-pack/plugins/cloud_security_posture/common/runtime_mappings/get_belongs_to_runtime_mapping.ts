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
  'rule.benchmark.posture_type': {
    type: 'keyword',
  },
  'cloud.account.id': {
    type: 'keyword',
  },
  'cloud.account.name': {
    type: 'keyword',
  },
  belongs_to: {
    type: 'keyword',
    script: {
      source: `
      def belongs_to = "";

      if (doc.containsKey('cluster_id') && doc["cluster_id"].size() > 0) {
          belongs_to = doc["cluster_id"].value;
      }

      if (!doc.containsKey('rule.benchmark.posture_type')) {
          emit(belongs_to);
          return;
      } else {
          if (doc["rule.benchmark.posture_type"].size() > 0) {
              def policy_template_type = doc["rule.benchmark.posture_type"].value;
              if (policy_template_type == "cspm") {
                if (doc.containsKey('cloud.account.name') && doc["cloud.account.name"].size() > 0 && doc["cloud.account.name"].value != '') {
                      belongs_to = doc["cloud.account.name"].value;
                  } else if (doc.containsKey('cloud.account.id') && doc["cloud.account.id"].size() > 0) {
                      belongs_to = doc["cloud.account.id"].value;
                  }
              } else if (policy_template_type == "kspm") {
                  if (doc.containsKey('cluster_id') && doc["cluster_id"].size() > 0) {
                      belongs_to = doc["cluster_id"].value;
                  }
              }
          }
          emit(belongs_to);
          return;
      }
      `,
    },
  },
});
