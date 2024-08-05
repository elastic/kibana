/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler } from '../../types';
import { fetchIndex, fetchSavedObjectNames, fetchSavedObjects } from '../../services/debug';
import type {
  FetchIndexRequestSchema,
  FetchSavedObjectNamesRequestSchema,
  FetchSavedObjectsRequestSchema,
} from '../../types/rest_spec/debug';

export const fetchIndexHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchIndexRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const res = await fetchIndex(esClient, request.body.index);
  return response.ok({ body: res });
};

export const fetchSavedObjectsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchSavedObjectsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;
  const res = await fetchSavedObjects(soClient, request.body.type, request.body.name);
  return response.ok({ body: res });
};

export const fetchSavedObjectNamesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchSavedObjectNamesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;
  const res = await fetchSavedObjectNames(soClient, request.body.type);
  return response.ok({ body: res });
};
