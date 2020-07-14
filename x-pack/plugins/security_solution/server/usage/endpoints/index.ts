/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { AgentMetadata } from '../../../../ingest_manager/common/types/models/agent';
import {
  getFleetSavedObjectsMetadata,
  getFleetEventsSavedObjects,
  FLEET_ENDPOINT_PACKAGE_CONSTANT,
} from './fleet_saved_objects';

export interface AgentOSMetadataTelemetry {
  full_name: string;
  platform: string;
  version: string;
  count: number;
}

export interface PoliciesTelemetry {
  malware: {
    success: number;
    warning: number;
    failure: number;
  };
}

export interface EndpointUsage {
  total_installed: number;
  active_within_last_24_hours: number;
  os: AgentOSMetadataTelemetry[];
  policies?: PoliciesTelemetry; // TODO: make required when able to enable policy information
}

export interface AgentLocalMetadata extends AgentMetadata {
  elastic: {
    agent: {
      id: string;
    };
  };
  host: {
    id: string;
  };
  os: {
    name: string;
    platform: string;
    version: string;
    full: string;
  };
}

export type OSTracker = Record<string, AgentOSMetadataTelemetry>;
/**
 * @description returns an empty telemetry object to be incrmented and updated within the `getEndpointTelemetryFromFleet` fn
 */
export const getDefaultEndpointTelemetry = (): EndpointUsage => ({
  total_installed: 0,
  active_within_last_24_hours: 0,
  os: [],
});

export const trackEndpointOSTelemetry = (
  os: AgentLocalMetadata['os'],
  osTracker: OSTracker
): OSTracker => {
  const updatedOSTracker = { ...osTracker };
  const { version: osVersion, platform: osPlatform, full: osFullName } = os;
  if (osFullName && osVersion) {
    if (updatedOSTracker[osFullName]) updatedOSTracker[osFullName].count += 1;
    else {
      updatedOSTracker[osFullName] = {
        full_name: osFullName,
        platform: osPlatform,
        version: osVersion,
        count: 1,
      };
    }
  }

  return updatedOSTracker;
};

/**
 * @description This aggregates the telemetry details from the two fleet savedObject sources, `fleet-agents` and `fleet-agent-events` to populate
 * the telemetry details for endpoint. Since we cannot access our own indices due to `kibana_system` not having access, this is the best alternative.
 * Once the data is requested, we iterate over all agents with endpoints registered, and then request the events for each active agent (within last 24 hours)
 * to confirm whether or not the endpoint is still active
 */
export const getEndpointTelemetryFromFleet = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<EndpointUsage> => {
  // Retrieve every agent that references the endpoint as an installed package. It will not be listed if it was never installed
  const { saved_objects: endpointAgents } = await getFleetSavedObjectsMetadata(savedObjectsClient);
  const endpointTelemetry = getDefaultEndpointTelemetry();

  // If there are no installed endpoints return the default telemetry object
  if (!endpointAgents || endpointAgents.length < 1) return endpointTelemetry;

  // Use unique hosts to prevent any potential duplicates
  const uniqueHostIds: Set<string> = new Set();
  // Need unique agents to get events data for those that have run in last 24 hours
  const uniqueAgentIds: Set<string> = new Set();

  const aDayAgo = new Date();
  aDayAgo.setDate(aDayAgo.getDate() - 1);
  let osTracker: OSTracker = {};

  const endpointMetadataTelemetry = endpointAgents.reduce(
    (metadataTelemetry, { attributes: metadataAttributes }) => {
      const { last_checkin: lastCheckin, local_metadata: localMetadata } = metadataAttributes;
      // The extended AgentMetadata is just an empty blob, so cast to account for our specific use case
      const { host, os, elastic } = localMetadata as AgentLocalMetadata;

      if (lastCheckin && new Date(lastCheckin) > aDayAgo) {
        // Get agents that have checked in within the last 24 hours to later see if their endpoints are running
        uniqueAgentIds.add(elastic.agent.id);
      }
      if (host && uniqueHostIds.has(host.id)) {
        return metadataTelemetry;
      } else {
        uniqueHostIds.add(host.id);
        osTracker = trackEndpointOSTelemetry(os, osTracker);
        return metadataTelemetry;
      }
    },
    endpointTelemetry
  );

  // All unique agents with an endpoint installed. You can technically install a new agent on a host, so relying on most recently installed.
  endpointTelemetry.total_installed = uniqueHostIds.size;

  // Get the objects to populate our OS Telemetry
  endpointMetadataTelemetry.os = Object.values(osTracker);

  // Check for agents running in the last 24 hours whose endpoints are still active
  for (const agentId of uniqueAgentIds) {
    const { saved_objects: agentEvents } = await getFleetEventsSavedObjects(
      savedObjectsClient,
      agentId
    );
    const lastEndpointStatus = agentEvents.find((agentEvent) =>
      agentEvent.attributes.message.includes(FLEET_ENDPOINT_PACKAGE_CONSTANT)
    );

    /*
      We can assume that if the last status of the endpoint is RUNNING and the agent has checked in within the last 24 hours
      then the endpoint has still been running within the last 24 hours. If / when we get the policy response, then we can use that
      instead
    */
    const endpointIsActive = lastEndpointStatus?.attributes.subtype === 'RUNNING';
    if (endpointIsActive) {
      endpointMetadataTelemetry.active_within_last_24_hours += 1;
    }
  }

  return endpointMetadataTelemetry;
};
