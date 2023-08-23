/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsServerSetup } from '../../../types';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export const getAgentPoliciesRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.AGENT_POLICIES,
  validate: {},
  handler: async ({ server, context, uptimeEsClient }): Promise<any> => {
    return getAgentPoliciesAsInternalUser(server);
  },
});

export const getAgentPoliciesAsInternalUser = async (server: SyntheticsServerSetup) => {
  const soClient = server.coreStart.savedObjects.createInternalRepository();
  const esClient = server.coreStart.elasticsearch.client.asInternalUser;

  return server.fleet?.agentPolicyService.list(soClient, {
    page: 1,
    perPage: 10000,
    sortField: 'name',
    sortOrder: 'asc',
    kuery: 'ingest-agent-policies.is_managed : false',
    esClient,
    withAgentCount: true,
  });
};
