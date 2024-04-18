/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEqual } from 'lodash';

import {
  SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../constants';

import { defaultFleetErrorHandler, FleetServerHostUnauthorizedError } from '../../errors';
import { agentPolicyService, appContextService, packagePolicyService } from '../../services';
import { getAgentStatusForAgentPolicy } from '../../services/agents';

import {
  createFleetServerHost,
  deleteFleetServerHost,
  getFleetServerHost,
  listFleetServerHosts,
  updateFleetServerHost,
} from '../../services/fleet_server_host';
import type {
  GetOneFleetServerHostRequestSchema,
  PostFleetServerHostRequestSchema,
  PutFleetServerHostRequestSchema,
} from '../../types';

import type { GetFleetServerStatusResponse } from '../../../common/types';

async function checkFleetServerHostsWriteAPIsAllowed(
  soClient: SavedObjectsClientContract,
  hostUrls: string[]
) {
  const cloudSetup = appContextService.getCloud();
  if (!cloudSetup?.isServerlessEnabled) {
    return;
  }

  // Fleet Server hosts must have the default host URL in serverless.
  const serverlessDefaultFleetServerHost = await getFleetServerHost(
    soClient,
    SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID
  );
  if (!isEqual(hostUrls, serverlessDefaultFleetServerHost.host_urls)) {
    throw new FleetServerHostUnauthorizedError(
      `Fleet server host must have default URL in serverless: ${serverlessDefaultFleetServerHost.host_urls}`
    );
  }
}

export const postFleetServerHost: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    // In serverless, allow create fleet server host if host url is same as default.
    await checkFleetServerHostsWriteAPIsAllowed(soClient, request.body.host_urls);

    const { id, ...data } = request.body;
    const FleetServerHost = await createFleetServerHost(
      soClient,
      { ...data, is_preconfigured: false },
      { id }
    );
    if (FleetServerHost.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    }

    const body = {
      item: FleetServerHost,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getFleetServerHostHandler: RequestHandler<
  TypeOf<typeof GetOneFleetServerHostRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const item = await getFleetServerHost(soClient, request.params.itemId);
    const body = {
      item,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const deleteFleetServerHostHandler: RequestHandler<
  TypeOf<typeof GetOneFleetServerHostRequestSchema.params>
> = async (context, request, response) => {
  try {
    const coreContext = await context.core;
    const soClient = coreContext.savedObjects.client;
    const esClient = coreContext.elasticsearch.client.asInternalUser;

    await deleteFleetServerHost(soClient, esClient, request.params.itemId);
    const body = {
      id: request.params.itemId,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const putFleetServerHostHandler: RequestHandler<
  TypeOf<typeof PutFleetServerHostRequestSchema.params>,
  undefined,
  TypeOf<typeof PutFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  try {
    const coreContext = await await context.core;
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const soClient = coreContext.savedObjects.client;

    // In serverless, allow update fleet server host if host url is same as default.
    if (request.body.host_urls) {
      await checkFleetServerHostsWriteAPIsAllowed(soClient, request.body.host_urls);
    }

    const item = await updateFleetServerHost(soClient, request.params.itemId, request.body);
    const body = {
      item,
    };

    if (item.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    } else {
      await agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts(soClient, esClient, item.id);
    }

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAllFleetServerHostsHandler: RequestHandler = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const res = await listFleetServerHosts(soClient);
    const body = {
      items: res.items,
      page: res.page,
      perPage: res.perPage,
      total: res.total,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getFleetServerStatusHandler: RequestHandler = async (context, request, response) => {
  const responseStatus: GetFleetServerStatusResponse = {
    agent_policies: [],
    has_active_fleet_server: false,
  };
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  try {
    // Retrieve fleet server package policies
    const fleetServerPackagePolicies = await packagePolicyService.list(soClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
    });

    // Extract associated agent policy IDs
    const fleetServerAgentPolicyIds = [
      ...new Set(fleetServerPackagePolicies.items.map((p) => p.policy_id)),
    ];

    // Find if there are any online or updating fleet servers
    if (fleetServerAgentPolicyIds.length > 0) {
      const agentStatusesRes = await getAgentStatusForAgentPolicy(
        esClient,
        soClient,
        undefined,
        fleetServerAgentPolicyIds.map((policyId) => `policy_id:${policyId}`).join(' or ')
      );

      responseStatus.has_active_fleet_server =
        agentStatusesRes.online > 0 || agentStatusesRes.updating > 0;
    }

    // Retrieve agent policies
    const agentPolicies = await agentPolicyService.getByIDs(soClient, fleetServerAgentPolicyIds);
    responseStatus.agent_policies = agentPolicies.map((policy) => ({
      id: policy.id,
      name: policy.name,
    }));

    return response.ok({ body: responseStatus });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
