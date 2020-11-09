/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep } from 'lodash';
import { ISavedObjectsRepository } from 'src/core/server';
import { SavedObject } from './../../../../../../src/core/types/saved_objects';
import { Agent, NewAgentEvent } from './../../../../fleet/common/types/models/agent';
import { AgentMetadata } from '../../../../fleet/common/types/models/agent';
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

type EndpointOSNames = 'Linux' | 'Windows' | 'macOS';

export interface AgentLocalMetadata extends AgentMetadata {
  elastic: {
    agent: {
      id: string;
    };
  };
  host: {
    hostname: string;
    id: string;
    name: string;
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
  let updatedOSTracker = osTracker;
  if (os && typeof os === 'object') {
    updatedOSTracker = cloneDeep(osTracker);
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
  const policyHostTypeToPolicyType = {
    Linux: 'linux',
    macOS: 'mac',
    Windows: 'windows',
  };
  const enabledMalwarePolicyTypes = ['prevent', 'detect'];

  // The policy details are sent as a string on the 'payload' attribute of the agent event
  const { payload } = latestEndpointEvent.attributes;

  if (!payload) {
    // This payload may not always be provided depending on the state of the endpoint. Guard again situations where it is not sent
    return policiesTracker;
  }

  let endpointPolicyPayload;
  try {
    endpointPolicyPayload = JSON.parse(latestEndpointEvent.attributes.payload);
  } catch (error) {
    return policiesTracker;
  }

  // Get the platform: windows, mac, or linux
  const hostType =
    policyHostTypeToPolicyType[
      endpointPolicyPayload['endpoint-security']?.host?.os?.name as EndpointOSNames
    ];
  // Get whether the malware setting for the platform on the most recently provided config is active (prevent or detect is on) or off
  const userDesiredMalwareState =
    endpointPolicyPayload['endpoint-security'].Endpoint?.configuration?.inputs[0]?.policy[hostType]
      ?.malware?.mode;

  // Get the status of the application of the malware protection
  const malwareStatus =
    endpointPolicyPayload['endpoint-security'].Endpoint?.policy?.applied?.response?.configurations
      ?.malware?.status;

  if (!userDesiredMalwareState || !malwareStatus) {
    // If we get policy information without the mode or status, then nothing to track or update
    return policiesTracker;
  }

  const updatedPoliciesTracker = {
    malware: { ...policiesTracker.malware },
  };

  const isAnActiveMalwareState = enabledMalwarePolicyTypes.includes(userDesiredMalwareState);

  // we only check for 'not failure' as the 'warning' state for malware is still technically actively enabled (with warnings)
  const successfullyEnabled = !!malwareStatus && malwareStatus !== 'failure';
  const failedToEnable = !!malwareStatus && malwareStatus === 'failure';

  if (isAnActiveMalwareState && successfullyEnabled) {
    updatedPoliciesTracker.malware.active += 1;
  } else if (!isAnActiveMalwareState && successfullyEnabled) {
    updatedPoliciesTracker.malware.inactive += 1;
  } else if (isAnActiveMalwareState && failedToEnable) {
    updatedPoliciesTracker.malware.failure += 1;
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
  // Retrieve every agent (max 10000) that references the endpoint as an installed package. It will not be listed if it was never installed
  let endpointAgents;
  try {
    const response = await getFleetSavedObjectsMetadata(soClient);
    endpointAgents = response.saved_objects;
  } catch (error) {
    // Better to provide an empty object rather than default telemetry as this better informs us of an error
    return {};
  }

  const endpointAgentsCount = endpointAgents.length;
  const endpointTelemetry = getDefaultEndpointTelemetry();

  // If there are no installed endpoints return the default telemetry object
  if (!endpointAgents || endpointAgentsCount < 1) return endpointTelemetry;

  // Use unique hosts to prevent any potential duplicates
  const uniqueHosts: Set<string> = new Set();
  let osTracker: OSTracker = {};
  let dailyActiveCount = 0;
  let policyTracker: PoliciesTelemetry = { malware: { active: 0, inactive: 0, failure: 0 } };

  for (let i = 0; i < endpointAgentsCount; i += 1) {
    try {
      const { attributes: metadataAttributes } = endpointAgents[i];
      const { last_checkin: lastCheckin, local_metadata: localMetadata } = metadataAttributes;
      const { host, os, elastic } = localMetadata as AgentLocalMetadata;

      // Although not perfect, the goal is to dedupe hosts to get the most recent data for a host
      // An agent re-installed on the same host will have the same id and hostname
      // A cloned VM will have the same id, but "may" have the same hostname, but it's really up to the user.
      const compoundUniqueId = `${host?.id}-${host?.hostname}`;
      if (!uniqueHosts.has(compoundUniqueId)) {
        uniqueHosts.add(compoundUniqueId);
        const agentId = elastic?.agent?.id;
        osTracker = updateEndpointOSTelemetry(os, osTracker);

        if (agentId) {
          const { saved_objects: agentEvents } = await getLatestFleetEndpointEvent(
            soClient,
            agentId
          );

          // AgentEvents will have a max length of 1
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
    } catch (error) {
      // All errors thrown in the loop would be handled here
      // Not logging any errors to avoid leaking any potential PII
      // Depending on when the error is thrown in the loop some specifics may be missing, but it allows the loop to continue
    }
  }

  // All unique hosts with an endpoint installed, thus all unique endpoint installs
  endpointTelemetry.total_installed = uniqueHosts.size;
  // Set the daily active count for the endpoints
  endpointTelemetry.active_within_last_24_hours = dailyActiveCount;
  // Get the objects to populate our OS Telemetry
  endpointTelemetry.os = Object.values(osTracker);
  // Provide the updated policy information
  endpointTelemetry.policies = policyTracker;

  return endpointTelemetry;
};
