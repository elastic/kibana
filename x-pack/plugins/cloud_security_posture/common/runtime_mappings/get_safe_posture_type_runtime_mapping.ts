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
  'rule.benchmark.posture_type': {
    type: 'keyword',
  },
  'cloud.account.id': {
    type: 'keyword',
  },
  'cloud.account.name': {
    type: 'keyword',
  },
  safe_posture_type: {
    type: 'keyword',
    script: {
      source: `
        if (!doc.containsKey('rule.benchmark.posture_type'))
          {
            def safe_posture_type = 'kspm';
            emit(safe_posture_type);
            return
          }
        else
        {
            def safe_posture_type = doc["rule.benchmark.posture_type"].value;
            emit(safe_posture_type);
            return
        }
      `,
    },
  },
});
