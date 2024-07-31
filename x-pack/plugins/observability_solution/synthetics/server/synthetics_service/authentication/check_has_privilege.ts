/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import { SyntheticsEsClient } from '../../lib';
import { SyntheticsServerSetup } from '../../types';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';
import { getServiceApiKeyPrivileges, syntheticsIndex } from '../get_api_key';

export const checkHasPrivileges = (
  server: SyntheticsServerSetup,
  apiKey: { id: string; apiKey: string }
) => {
  const { indices: index, cluster } = getServiceApiKeyPrivileges(server.isElasticsearchServerless);
  return server.coreStart.elasticsearch.client
    .asScoped(getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey }))
    .asCurrentUser.security.hasPrivileges({
      body: {
        index,
        cluster,
      },
    });
};

export const checkIndicesReadPrivileges = (syntheticsEsClient: SyntheticsEsClient) => {
  return syntheticsEsClient.baseESClient.security.hasPrivileges({
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
