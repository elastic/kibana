/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, FLEET_SERVER_PACKAGE } from '../../../common/constants';

import type {
  GetEnrollmentSettingsResponse,
  AgentPolicy,
  EnrollmentSettingsAgentPolicy,
} from '../../../common/types';
import type { FleetRequestHandler, GetEnrollmentSettingsRequestSchema } from '../../types';
import { defaultFleetErrorHandler } from '../../errors';
import { agentPolicyService, packagePolicyService, downloadSourceService } from '../../services';
import { getAgentStatusForAgentPolicy } from '../../services/agents';
import { getFleetServerHostsForAgentPolicy } from '../../services/fleet_server_host';
import { getFleetProxy } from '../../services/fleet_proxies';

export const getEnrollmentSettingsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetEnrollmentSettingsRequestSchema.query>
> = async (context, request, response) => {
  const agentPolicyId = request.query?.agentPolicyId;
  const settingsResponse: GetEnrollmentSettingsResponse = {
    fleet_server: {
      agent_policies: [],
      has_active: false,
    },
  };
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  try {
    // Get all possible fleet server or scoped normal agent policies
    const { fleetServerAgentPolicies, scopedAgentPolicy: scopedAgentPolicyResponse } =
      await getFleetServerAgentPolicies(soClient, agentPolicyId);
    const scopedAgentPolicy = scopedAgentPolicyResponse || {
      id: undefined,
      name: undefined,
      fleet_server_host_id: undefined,
      download_source_id: undefined,
    };

    // Check if there is any active fleet server enrolled into the fleet server policies policies
    if (fleetServerAgentPolicies) {
      settingsResponse.fleet_server.agent_policies = fleetServerAgentPolicies;
      settingsResponse.fleet_server.has_active = await hasActiveFleetServersForAgentPolicies(
        esClient,
        soClient,
        fleetServerAgentPolicies.map((p) => p.id)
      );
    }

    // Get download source
    settingsResponse.download_source = await getDownloadSource(
      soClient,
      scopedAgentPolicy.download_source_id ?? undefined
    );

    // Get associated fleet server host, or default one if it doesn't exist
    // `getFleetServerHostsForAgentPolicy` errors if there is no default, so catch it
    try {
      settingsResponse.fleet_server.host = await getFleetServerHostsForAgentPolicy(
        soClient,
        scopedAgentPolicy
      );
    } catch (e) {
      settingsResponse.fleet_server.host = undefined;
    }

    // if a fleet server host was found, get associated fleet server host proxy if any
    if (settingsResponse.fleet_server.host?.proxy_id) {
      settingsResponse.fleet_server.host_proxy = await getFleetProxy(
        soClient,
        settingsResponse.fleet_server.host.proxy_id
      );
    }

    return response.ok({ body: settingsResponse });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

const getFleetServerAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string
): Promise<{
  fleetServerAgentPolicies?: EnrollmentSettingsAgentPolicy[];
  scopedAgentPolicy?: EnrollmentSettingsAgentPolicy;
}> => {
  const mapPolicy = (policy: AgentPolicy) => ({
    id: policy.id,
    name: policy.name,
    is_managed: policy.is_managed,
    is_default_fleet_server: policy.is_default_fleet_server,
    has_fleet_server: policy.has_fleet_server,
    fleet_server_host_id: policy.fleet_server_host_id,
    download_source_id: policy.download_source_id,
  });

  // If an agent policy is specified, return only that policy
  if (agentPolicyId) {
    const agentPolicy = await agentPolicyService.get(soClient, agentPolicyId, true);
    if (agentPolicy) {
      if (agentPolicy.package_policies?.find((p) => p.package?.name === FLEET_SERVER_PACKAGE)) {
        return {
          fleetServerAgentPolicies: [mapPolicy(agentPolicy)],
          scopedAgentPolicy: mapPolicy(agentPolicy),
        };
      } else {
        return {
          scopedAgentPolicy: mapPolicy(agentPolicy),
        };
      }
    }
    return {};
  }

  // If an agent policy is not specified, perform default behavior to retrieve all fleet server policies
  const fleetServerPackagePolicies = await packagePolicyService.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE} ${
      agentPolicyId ? `and ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_id:${agentPolicyId}` : ``
    }`,
  });

  // Extract associated fleet server agent policy IDs
  const fleetServerAgentPolicyIds = [
    ...new Set(fleetServerPackagePolicies.items.map((p) => p.policy_id)),
  ];

  // Retrieve associated agent policies
  const fleetServerAgentPolicies = fleetServerAgentPolicyIds.length
    ? await agentPolicyService.getByIDs(soClient, fleetServerAgentPolicyIds)
    : [];

  return {
    fleetServerAgentPolicies: fleetServerAgentPolicies.map(mapPolicy),
  };
};

const hasActiveFleetServersForAgentPolicies = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyIds: string[]
): Promise<boolean> => {
  if (agentPolicyIds.length > 0) {
    const agentStatusesRes = await getAgentStatusForAgentPolicy(
      esClient,
      soClient,
      undefined,
      agentPolicyIds.map((id) => `policy_id:${id}`).join(' or ')
    );

    return agentStatusesRes.online > 0 || agentStatusesRes.updating > 0;
  }
  return false;
};

const getDownloadSource = async (
  soClient: SavedObjectsClientContract,
  downloadSourceId?: string
): Promise<Promise<GetEnrollmentSettingsResponse['download_source']>> => {
  const sources = await downloadSourceService.list(soClient);
  return downloadSourceId
    ? sources.items.find((s) => s.id === downloadSourceId)
    : sources.items.find((s) => s.is_default);
};
