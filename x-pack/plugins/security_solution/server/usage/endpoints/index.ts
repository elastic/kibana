/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep } from 'lodash';
import { ISavedObjectsRepository } from 'src/core/server';
import { SavedObject } from './../../../../../../src/core/types/saved_objects';
import { Agent, NewAgentEvent } from './../../../../ingest_manager/common/types/models/agent';
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
 * @description this function updates the os telemetry. We use the fullName field as the key as it contains the name and version details.
 * If it has already been tracked, the count will be updated, otherwise a tracker will be initialized for that fullName.
 */
export const updateEndpointOSTelemetry = (
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
 * @description we take the latest endpoint specific agent event, get the status of the endpoint, and if it is running
 * and the agent itself has been active within the last 24 hours, we can safely assume the endpoint has been active within
 * the same time span.
 */
export const updateEndpointDailyActiveCount = (
  latestEndpointEvent: SavedObject<NewAgentEvent>,
  lastAgentCheckin: Agent['last_checkin'],
  currentCount: number
) => {
  const aDayAgo = new Date();
  aDayAgo.setDate(aDayAgo.getDate() - 1);

  const agentWasActiveOverLastDay = !!lastAgentCheckin && new Date(lastAgentCheckin) > aDayAgo;
  return agentWasActiveOverLastDay && latestEndpointEvent.attributes.subtype === 'RUNNING'
    ? currentCount + 1
    : currentCount;
};

/**
 * @description We take the latest endpoint specific agent event, and as long as it provides the payload with policy details, we will parse that policy
 * to populate the success of it's application. The policy is provided in the agent health checks.
 */
export const updateEndpointPolicyTelemetry = (
  latestEndpointEvent: SavedObject<NewAgentEvent>,
  policiesTracker: PoliciesTelemetry
): PoliciesTelemetry => {
  const updatedPoliciesTracker = cloneDeep(policiesTracker);

  const policyHostTypeToPolicyType = {
    Linux: 'linux',
    macOs: 'mac',
    Windows: 'windows',
  };
  const enabledMalwarePolicyTypes = ['prevent', 'detect'];

  // The policy details are sent as a string on the 'payload' attribute of the agent event
  const endpointPolicyPayload = latestEndpointEvent.attributes.payload
    ? JSON.parse(latestEndpointEvent.attributes.payload)
    : null;

  if (endpointPolicyPayload) {
    // Get the platform: windows, mac, or linux
    const hostType =
      policyHostTypeToPolicyType[
        endpointPolicyPayload['endpoint-security']?.host?.os?.name as EndpointOSNames
      ];
    // Get whether the malware setting for the platform on the most recently provided config is active (prevent or detect is on) or off
    const userDesiredMalwareState =
      endpointPolicyPayload['endpoint-security'].Endpoint?.configuration?.inputs[0]?.policy[
        hostType
      ]?.malware?.mode;
    const isAnActiveMalwareState = enabledMalwarePolicyTypes.includes(userDesiredMalwareState);

    // Get the status of the application of the malware protection
    const malwareStatus =
      endpointPolicyPayload['endpoint-security'].Endpoint?.policy?.applied?.response?.configurations
        ?.malware?.status;

    // the warning state for endpoint is still technically active
    if (isAnActiveMalwareState && malwareStatus !== 'failure') {
      updatedPoliciesTracker.malware.active += 1;
    }
    if (!isAnActiveMalwareState) {
      updatedPoliciesTracker.malware.inactive += 1;
    }
    // The user wanted to activate malware, but that request failed
    if (isAnActiveMalwareState && malwareStatus === 'failure') {
      updatedPoliciesTracker.malware.failure += 1;
    }
  }

  return updatedPoliciesTracker;
};

/**
 * @description This aggregates the telemetry details from the two fleet savedObject sources, `fleet-agents` and `fleet-agent-events` to populate
 * the telemetry details for endpoint. Since we cannot access our own indices due to `kibana_system` not having access, this is the best alternative.
 * Once the data is requested, we iterate over all agents with endpoints registered, and then request the events for each active agent (within last 24 hours)
 * to confirm whether or not the endpoint is still active
 */
export const getEndpointTelemetryFromFleet = async (
  soClient: ISavedObjectsRepository
): Promise<EndpointUsage | {}> => {
  // Retrieve every agent that references the endpoint as an installed package. It will not be listed if it was never installed
  let endpointAgents;
  try {
    const response = await getFleetSavedObjectsMetadata(soClient);
    endpointAgents = response.saved_objects;
  } catch (error) {
    // Return an empty object to handle request failure.
    // Better to provide an empty object that default telemetry as this informs us of an error
    return {};
  }

  const agentTotal = endpointAgents.length;
  const endpointTelemetry = getDefaultEndpointTelemetry();

  // If there are no installed endpoints return the default telemetry object
  if (!endpointAgents || agentTotal < 1) return endpointTelemetry;

  // Use unique hosts to prevent any potential duplicates
  const uniqueHostIds: Set<string> = new Set();
  let osTracker: OSTracker = {};
  let dailyActiveCount = 0;
  let policyTracker: PoliciesTelemetry = { malware: { active: 0, inactive: 0, failure: 0 } };

  for (let i = 0; i < agentTotal; i += 1) {
    const { attributes: metadataAttributes } = endpointAgents[i];
    const { last_checkin: lastCheckin, local_metadata: localMetadata } = metadataAttributes;
    const { host, os, elastic } = localMetadata as AgentLocalMetadata; // AgentMetadata is just an empty blob, casting for our  use case

    if (!uniqueHostIds.has(host.id)) {
      uniqueHostIds.add(host.id);
      const agentId = elastic?.agent?.id;
      osTracker = updateEndpointOSTelemetry(os, osTracker);

      if (agentId) {
        let agentEvents;
        try {
          const response = await getLatestFleetEndpointEvent(soClient, agentId);
          agentEvents = response.saved_objects;
        } catch (error) {
          // Continue on with the loop if the request fails
          break;
        }

        if (agentEvents && agentEvents.length > 0) {
          const latestEndpointEvent = agentEvents[0];
          dailyActiveCount = updateEndpointDailyActiveCount(
            latestEndpointEvent,
            lastCheckin,
            dailyActiveCount
          );
          policyTracker = updateEndpointPolicyTelemetry(latestEndpointEvent, policyTracker);
        }
      }
    }
  }

  // All unique hosts with an endpoint installed, thus all unique endpoint installs
  endpointTelemetry.total_installed = uniqueHostIds.size;
  // Set the daily active count for the endpoints
  endpointTelemetry.active_within_last_24_hours = dailyActiveCount;
  // Get the objects to populate our OS Telemetry
  endpointTelemetry.os = Object.values(osTracker);
  // Provide the updated policy information
  endpointTelemetry.policies = policyTracker;

  return endpointTelemetry;
};
