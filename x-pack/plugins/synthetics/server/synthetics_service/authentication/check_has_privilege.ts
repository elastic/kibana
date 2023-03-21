/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';
import { serviceApiKeyPrivileges } from '../get_api_key';

export const checkHasPrivileges = async (
  server: UptimeServerSetup,
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
