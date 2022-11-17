/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

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
    const coreContext = await await context.core;
    const soClient = coreContext.savedObjects.client;

    const item = await updateFleetProxy(soClient, request.params.itemId, request.body);
    const body = {
      item,
    };

    // TODO bump policies on update

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
