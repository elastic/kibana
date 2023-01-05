/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import pMap from 'p-map';

import {
  listFleetProxies,
  createFleetProxy,
  deleteFleetProxy,
  getFleetProxy,
  updateFleetProxy,
} from '../../services/fleet_proxies';
import { defaultFleetErrorHandler } from '../../errors';
import type {
  GetOneFleetProxyRequestSchema,
  PostFleetProxyRequestSchema,
  PutFleetProxyRequestSchema,
} from '../../types';
import { listFleetServerHostsForProxyId } from '../../services/fleet_server_host';
import { agentPolicyService, outputService } from '../../services';

export const postFleetProxyHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetProxyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  try {
    const { id, ...data } = request.body;
    const proxy = await createFleetProxy(soClient, { ...data, is_preconfigured: false }, { id });

    const body = {
      item: proxy,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const putFleetProxyHandler: RequestHandler<
  TypeOf<typeof PutFleetProxyRequestSchema.params>,
  undefined,
  TypeOf<typeof PutFleetProxyRequestSchema.body>
> = async (context, request, response) => {
  try {
    const proxyId = request.params.itemId;
    const coreContext = await await context.core;
    const soClient = coreContext.savedObjects.client;
    const esClient = coreContext.elasticsearch.client.asInternalUser;

    const item = await updateFleetProxy(soClient, proxyId, request.body);
    const body = {
      item,
    };

    // Bump all the agent policy that use that proxy
    const [{ items: fleetServerHosts }, { items: outputs }] = await Promise.all([
      listFleetServerHostsForProxyId(soClient, proxyId),
      outputService.listAllForProxyId(soClient, proxyId),
    ]);
    if (
      fleetServerHosts.some((host) => host.is_default) ||
      outputs.some((output) => output.is_default || output.is_default_monitoring)
    ) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    } else {
      await pMap(
        outputs,
        (output) => agentPolicyService.bumpAllAgentPoliciesForOutput(soClient, esClient, output.id),
        {
          concurrency: 20,
        }
      );
      await pMap(
        fleetServerHosts,
        (fleetServerHost) =>
          agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts(
            soClient,
            esClient,
            fleetServerHost.id
          ),
        {
          concurrency: 20,
        }
      );
    }

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Proxy ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAllFleetProxyHandler: RequestHandler = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const res = await listFleetProxies(soClient);
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

export const deleteFleetProxyHandler: RequestHandler<
  TypeOf<typeof GetOneFleetProxyRequestSchema.params>
> = async (context, request, response) => {
  try {
    const coreContext = await context.core;
    const soClient = coreContext.savedObjects.client;
    await deleteFleetProxy(soClient, request.params.itemId);
    const body = {
      id: request.params.itemId,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet proxy ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const getFleetProxyHandler: RequestHandler<
  TypeOf<typeof GetOneFleetProxyRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const item = await getFleetProxy(soClient, request.params.itemId);
    const body = {
      item,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet proxy ${request.params.itemId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};
