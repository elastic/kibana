/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';

/**
 * Creates the `asset_identifier` runtime field with the value of either
 * `account.cloud.id` or `cluster.id` based on the value of `rule.benchmark.posture_type`
 */
export const getIdentifierRuntimeMapping = (): MappingRuntimeFields => ({
  asset_identifier: {
    type: 'keyword',
    script: {
      source: `
        if (!doc.containsKey('rule.benchmark.posture_type'))
          {
            def identifier = doc["cluster_id"].value;
            emit(identifier);
            return
          }
        else
        {
          if(doc["rule.benchmark.posture_type"].size() > 0)
            {
              def policy_template_type = doc["rule.benchmark.posture_type"].value;
              if (policy_template_type == "cspm")
              {
                def identifier = doc["cloud.account.id"].value;
                emit(identifier);
                return
              }

              if (policy_template_type == "kspm")
              {
                def identifier = doc["cluster_id"].value;
                emit(identifier);
                return
              }
            }

            def identifier = doc["cluster_id"].value;
            emit(identifier);
            return
        }
      `,
    },
  },
});
