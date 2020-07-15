/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { AgentEventSOAttributes } from './../../../../ingest_manager/common/types/models/agent';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
} from './../../../../ingest_manager/common/constants/agent';
import { Agent, DefaultPackages as FleetDefaultPackages } from '../../../../ingest_manager/common';

export const FLEET_ENDPOINT_PACKAGE_CONSTANT = FleetDefaultPackages.endpoint;

export const getFleetSavedObjectsMetadata = async (savedObjectsClient: ISavedObjectsRepository) =>
  savedObjectsClient.find<Agent>({
    type: AGENT_SAVED_OBJECT_TYPE,
    fields: ['packages', 'last_checkin', 'local_metadata'],
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
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    filter: `${AGENT_EVENT_SAVED_OBJECT_TYPE}.attributes.agent_id: ${agentId} and ${AGENT_EVENT_SAVED_OBJECT_TYPE}.attributes.message: "${FLEET_ENDPOINT_PACKAGE_CONSTANT}"`,
    perPage: 1, // Get the most recent endpoint event.
    sortField: 'timestamp',
    sortOrder: 'desc',
    search: agentId,
    searchFields: ['agent_id'],
  });
