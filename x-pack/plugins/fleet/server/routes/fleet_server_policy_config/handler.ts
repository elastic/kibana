/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { defaultFleetErrorHandler } from '../../errors';
import { agentPolicyService } from '../../services';
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

export const postFleetServerHost: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
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

export const getFleetServerPolicyHandler: RequestHandler<
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

export const deleteFleetServerPolicyHandler: RequestHandler<
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

export const putFleetServerPolicyHandler: RequestHandler<
  TypeOf<typeof PutFleetServerHostRequestSchema.params>,
  undefined,
  TypeOf<typeof PutFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  try {
    const coreContext = await await context.core;
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const soClient = coreContext.savedObjects.client;

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

export const getAllFleetServerPolicyHandler: RequestHandler<
  TypeOf<typeof PutFleetServerHostRequestSchema.params>,
  undefined,
  TypeOf<typeof PutFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
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
