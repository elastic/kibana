/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const getSafeCspmCloudAccountIdRuntimeMapping = (): MappingRuntimeFields => ({
  safe_cloud_account_id: {
    type: 'keyword',
    script: {
      source: `
        def cloudAccountIdAvailable = doc.containsKey("cloud.account.id") &&
          !doc["cloud.account.id"].empty;
        if (cloudAccountIdAvailable) {
          emit(doc["cloud.account.id"].value);
        }
        `,
    },
  },
});
