/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'src/core/server';
import { AgentService } from '../../../../fleet/server';
import { defaultPackages as FleetDefaultPackages } from '../../../../fleet/common';

export const FLEET_ENDPOINT_PACKAGE_CONSTANT = FleetDefaultPackages.Endpoint;

export const AGENT_EVENT_SAVED_OBJECT_TYPE = 'donotexistsanymore-since-7.13';

export const getEndpointIntegratedFleetMetadata = async (
  agentService: AgentService | undefined,
  esClient: ElasticsearchClient
) => {
  return agentService?.listAgents(esClient, {
    kuery: `(packages : ${FLEET_ENDPOINT_PACKAGE_CONSTANT})`,
    perPage: 10000,
    showInactive: false,
    sortField: 'enrolled_at',
    sortOrder: 'desc',
  });
};

/*
  TODO: AS OF 7.13, this access will no longer work due to the enabling of fleet server. An alternative route will have
  to be discussed to retrieve the policy data we need, as well as when the endpoint was last active, which is obtained
  via the last endpoint 'check in' event that was sent to fleet. Also, the only policy currently tracked is `malware`,
  but the hope is to add more, so a better/more scalable solution would be desirable.
*/

export const getLatestFleetEndpointEvent = async (
  savedObjectsClient: SavedObjectsClientContract,
  agentId: string
): Promise<SavedObjectsFindResponse> =>
  // Agent events saved object do not exists in Fleet anymore
  ({ total: 0, saved_objects: [], page: 0, per_page: 0 });
