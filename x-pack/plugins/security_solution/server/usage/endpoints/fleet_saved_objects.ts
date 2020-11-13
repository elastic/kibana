/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { AgentEventSOAttributes } from './../../../../fleet/common/types/models/agent';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
} from './../../../../fleet/common/constants/agent';
import { Agent, defaultPackages as FleetDefaultPackages } from '../../../../fleet/common';

export const FLEET_ENDPOINT_PACKAGE_CONSTANT = FleetDefaultPackages.Endpoint;

export const getFleetSavedObjectsMetadata = async (savedObjectsClient: ISavedObjectsRepository) =>
  savedObjectsClient.find<Agent>({
    // Get up to 10000 agents with endpoint installed
    type: AGENT_SAVED_OBJECT_TYPE,
    fields: [
      'packages',
      'last_checkin',
      'local_metadata.agent.id',
      'local_metadata.host.id',
      'local_metadata.host.name',
      'local_metadata.host.hostname',
      'local_metadata.elastic.agent.id',
      'local_metadata.os',
    ],
    filter: `${AGENT_SAVED_OBJECT_TYPE}.attributes.packages: ${FLEET_ENDPOINT_PACKAGE_CONSTANT}`,
    perPage: 10000,
    sortField: 'enrolled_at',
    sortOrder: 'desc',
  });

export const getLatestFleetEndpointEvent = async (
  savedObjectsClient: ISavedObjectsRepository,
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
