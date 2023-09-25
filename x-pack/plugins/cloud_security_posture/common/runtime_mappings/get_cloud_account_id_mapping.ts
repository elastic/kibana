/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const getSafeCloudAccountIdRuntimeMapping = (): MappingRuntimeFields => ({
  asset_identifier: {
    type: 'keyword',
    script: {
      source: `
        def cloudAccountIdAvailable = doc.containsKey("cloud.account.id") &&
          !doc["cloud.account.id"].empty;
        def packagePolicyId = doc.containsKey("cloud_security_posture.package_policy_id") &&
          !doc["cloud_security_posture.package_policy_id"].empty;
        if (cloudAccountIdAvailable) {
          emit(doc["cloud.account.id"].value);
        }
        if (packagePolicyId) {
          emit(doc["cloud_security_posture.package_policy_id"].value);
        } 
        `,
    },
  },
});
