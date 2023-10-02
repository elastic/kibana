/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const getPackagePolicyIdRuntimeMapping = (): MappingRuntimeFields => ({
  package_policy_identifier: {
    type: 'keyword',
    script: {
      source: `
        def packagePolicyIdAvailable = doc.containsKey("cloud_security_posture.package_policy.id") &&
          !doc["cloud_security_posture.package_policy.id"].empty;
        if (packagePolicyIdAvailable) {
          emit(doc["cloud_security_posture.package_policy.id"].value);
        }
        `,
    },
  },
});
