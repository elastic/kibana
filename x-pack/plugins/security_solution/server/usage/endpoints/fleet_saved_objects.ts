/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { AgentService } from '../../../../fleet/server';
import { AgentEventSOAttributes } from './../../../../fleet/common/types/models/agent';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
} from './../../../../fleet/common/constants/agent';
import { defaultPackages as FleetDefaultPackages } from '../../../../fleet/common';

export const FLEET_ENDPOINT_PACKAGE_CONSTANT = FleetDefaultPackages.Endpoint;

export const getFleetSavedObjectsMetadata = async (
  savedObjectsClient: SavedObjectsClientContract,
  agentService: AgentService | undefined,
  esClient: ElasticsearchClient
) => {
  const agentData = await agentService?.listAgents(savedObjectsClient, esClient, {
    showInactive: true,
    perPage: 10000,
    sortField: 'enrolled_at',
    sortOrder: 'desc',
    kuery: `${AGENT_SAVED_OBJECT_TYPE}.attributes.packages: ${FLEET_ENDPOINT_PACKAGE_CONSTANT}`,
  });
  return agentData;
};

/*
  TODO: AS OF 7.13, this access will no longer work due to the enabling of fleet server. An alternative route will have
  to be discussed to retrieve the policy data we need. Currently it's only `malware`, but the hope is to add more,
  so a more scalable solution will be desirable.
*/

export const getLatestFleetEndpointEvent = async (
  savedObjectsClient: SavedObjectsClientContract,
  agentId: string
) =>
  savedObjectsClient.find<AgentEventSOAttributes>({
    // Get the most recent endpoint event.
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    fields: ['agent_id', 'subtype', 'payload'],
    filter: `${AGENT_EVENT_SAVED_OBJECT_TYPE}.attributes.message: "${FLEET_ENDPOINT_PACKAGE_CONSTANT}"`,
    perPage: 1,
    sortField: 'timestamp',
    sortOrder: 'desc',
    search: agentId,
    searchFields: ['agent_id'],
  });
