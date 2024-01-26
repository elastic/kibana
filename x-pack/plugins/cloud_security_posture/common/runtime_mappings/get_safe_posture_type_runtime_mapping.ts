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
export const getSafePostureTypeRuntimeMapping = (): MappingRuntimeFields => ({
  safe_posture_type: {
    type: 'keyword',
    script: {
      source: `
        def postureTypeAvailable = doc.containsKey("rule.benchmark.posture_type") &&
          !doc["rule.benchmark.posture_type"].empty;

        if (!postureTypeAvailable) {
          // Before 8.7 release
          emit("kspm");
        } else {
          emit(doc["rule.benchmark.posture_type"].value);
        }
      `,
    },
  },
});
