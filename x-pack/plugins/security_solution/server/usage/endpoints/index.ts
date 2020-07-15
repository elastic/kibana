/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { AgentMetadata } from '../../../../ingest_manager/common/types/models/agent';
import { getFleetSavedObjectsMetadata, getLatestFleetEndpointEvent } from './fleet_saved_objects';

export interface AgentOSMetadataTelemetry {
  full_name: string;
  platform: string;
  version: string;
  count: number;
}
export interface PolicyTelemetry {
  active: number;
  inactive: number;
  failure: number;
}

export interface PoliciesTelemetry {
  malware: PolicyTelemetry;
}

export interface EndpointUsage {
  total_installed: number;
  active_within_last_24_hours: number;
  os: AgentOSMetadataTelemetry[];
  policies: PoliciesTelemetry;
}

type EndpointOSNames = 'Linux' | 'Windows' | 'macOs';

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

type OSTracker = Record<string, AgentOSMetadataTelemetry>;
type AgentDailyActiveTracker = Map<string, boolean>;
/**
 * @description returns an empty telemetry object to be incrmented and updated within the `getEndpointTelemetryFromFleet` fn
 */
export const getDefaultEndpointTelemetry = (): EndpointUsage => ({
  total_installed: 0,
  active_within_last_24_hours: 0,
  os: [],
  policies: {
    malware: {
      active: 0,
      inactive: 0,
      failure: 0,
    },
  },
});

/**
 * @description this fun
 */
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
 * @description This iterates over all unique agents that currently track an endpoint package. It takes a list of agents who have checked in in the last 24 hours
 * and then checks whether those agents have endpoints whose latest status is 'RUNNING' to determine an active_within_last_24_hours. Since the policy information is also tracked in these events
 * we pull out the status of the current protection (malware) type. This must be done in a compound manner as the desired status is reflected in the config, and the successful application of that policy
 * is tracked in the policy.applied.response.configurations[protectionsType].status. Using these two we can determine whether the policy is toggled on, off, or failed to turn on.
 */
export const addEndpointDailyActivityAndPolicyDetailsToTelemetry = async (
  agentDailyActiveTracker: AgentDailyActiveTracker,
  savedObjectsClient: ISavedObjectsRepository,
  endpointTelemetry: EndpointUsage
): Promise<EndpointUsage> => {
  const updatedEndpointTelemetry = { ...endpointTelemetry };

  const policyHostTypeToPolicyType = {
    Linux: 'linux',
    macOs: 'mac',
    Windows: 'windows',
  };
  const enabledMalwarePolicyTypes = ['prevent', 'detect'];

  for (const agentId of agentDailyActiveTracker.keys()) {
    const { saved_objects: agentEvents } = await getLatestFleetEndpointEvent(
      savedObjectsClient,
      agentId
    );

    const latestEndpointEvent = agentEvents[0];
    if (latestEndpointEvent) {
      /*
        We can assume that if the last status of the endpoint is RUNNING and the agent has checked in within the last 24 hours
        then the endpoint has still been running within the last 24 hours.
      */
      const { subtype, payload } = latestEndpointEvent.attributes;
      const endpointIsActive =
        subtype === 'RUNNING' && agentDailyActiveTracker.get(agentId) === true;

      if (endpointIsActive) {
        updatedEndpointTelemetry.active_within_last_24_hours += 1;
      }

      // The policy details are sent as a string on the 'payload' attribute of the agent event
      const endpointPolicyDetails = payload ? JSON.parse(payload) : null;
      if (endpointPolicyDetails) {
        // We get the setting the user desired to enable (treating prevent and detect as 'active' states) and then see if it succeded or failed.
        const hostType =
          policyHostTypeToPolicyType[
            endpointPolicyDetails['endpoint-security']?.host?.os?.name as EndpointOSNames
          ];
        const userDesiredMalwareState =
          endpointPolicyDetails['endpoint-security'].Endpoint?.configuration?.inputs[0]?.policy[
            hostType
          ]?.malware?.mode;

        const isAnActiveMalwareState = enabledMalwarePolicyTypes.includes(userDesiredMalwareState);
        const malwareStatus =
          endpointPolicyDetails['endpoint-security'].Endpoint?.policy?.applied?.response
            ?.configurations?.malware?.status;

        if (isAnActiveMalwareState && malwareStatus !== 'failure') {
          updatedEndpointTelemetry.policies.malware.active += 1;
        }
        if (!isAnActiveMalwareState) {
          updatedEndpointTelemetry.policies.malware.inactive += 1;
        }
        if (isAnActiveMalwareState && malwareStatus === 'failure') {
          updatedEndpointTelemetry.policies.malware.failure += 1;
        }
      }
    }
  }

  return updatedEndpointTelemetry;
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
  // Need agents to get events data for those that have run in last 24 hours as well as policy details
  const agentDailyActiveTracker: AgentDailyActiveTracker = new Map();

  const aDayAgo = new Date();
  aDayAgo.setDate(aDayAgo.getDate() - 1);
  let osTracker: OSTracker = {};

  const endpointMetadataTelemetry = endpointAgents.reduce(
    (metadataTelemetry, { attributes: metadataAttributes }) => {
      const { last_checkin: lastCheckin, local_metadata: localMetadata } = metadataAttributes;
      const { host, os, elastic } = localMetadata as AgentLocalMetadata; // AgentMetadata is just an empty blob, casting for our  use case

      if (host && uniqueHostIds.has(host.id)) {
        // use hosts since new agents could potentially be re-installed on existing hosts
        return metadataTelemetry;
      } else {
        uniqueHostIds.add(host.id);
        const isActiveWithinLastDay = !!lastCheckin && new Date(lastCheckin) > aDayAgo;
        agentDailyActiveTracker.set(elastic.agent.id, isActiveWithinLastDay);
        osTracker = trackEndpointOSTelemetry(os, osTracker);
        return metadataTelemetry;
      }
    },
    endpointTelemetry
  );

  // All unique hosts with an endpoint installed.
  endpointTelemetry.total_installed = uniqueHostIds.size;
  // Get the objects to populate our OS Telemetry
  endpointMetadataTelemetry.os = Object.values(osTracker);
  // Populate endpoint telemetry with the finalized 24 hour count and policy details
  const finalizedEndpointTelemetryData = await addEndpointDailyActivityAndPolicyDetailsToTelemetry(
    agentDailyActiveTracker,
    savedObjectsClient,
    endpointMetadataTelemetry
  );

  return finalizedEndpointTelemetryData;
};
