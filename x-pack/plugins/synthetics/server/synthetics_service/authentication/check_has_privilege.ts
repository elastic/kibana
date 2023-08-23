/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import { UptimeEsClient } from '../../lib';
import { SyntheticsServerSetup } from '../../types';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';
import { serviceApiKeyPrivileges, syntheticsIndex } from '../get_api_key';

export const checkHasPrivileges = async (
  server: SyntheticsServerSetup,
  apiKey: { id: string; apiKey: string }
) => {
  return await server.coreStart.elasticsearch.client
    .asScoped(getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey }))
    .asCurrentUser.security.hasPrivileges({
      body: {
        index: serviceApiKeyPrivileges.indices,
        cluster: serviceApiKeyPrivileges.cluster,
      },
    });
};

export const checkIndicesReadPrivileges = async (uptimeEsClient: UptimeEsClient) => {
  return await uptimeEsClient.baseESClient.security.hasPrivileges({
    body: {
      index: [
        {
          names: [syntheticsIndex],
          privileges: ['read'] as SecurityIndexPrivilege[],
        },
      ],
    },
  });
};
