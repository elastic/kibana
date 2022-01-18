/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { HostStatus } from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import {
  getLogger,
  getMetadataRequestHandler,
  getMetadataListRequestHandler,
  getMetadataTransformStatsHandler,
} from './handlers';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
} from '../../../../common/endpoint/constants';
import { GetMetadataListRequestSchema } from '../../../../common/endpoint/schema/metadata';
import { withEndpointAuthz } from '../with_endpoint_authz';

/* Filters that can be applied to the endpoint fetch route */
export const endpointFilters = schema.object({
  kql: schema.nullable(schema.string()),
  host_status: schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(HostStatus.HEALTHY.toString()),
        schema.literal(HostStatus.OFFLINE.toString()),
        schema.literal(HostStatus.UPDATING.toString()),
        schema.literal(HostStatus.UNHEALTHY.toString()),
        schema.literal(HostStatus.INACTIVE.toString()),
      ])
    )
  ),
});

export const GetMetadataRequestSchema = {
  params: schema.object({ id: schema.string() }),
};

export function registerEndpointRoutes(
  router: SecuritySolutionPluginRouter,
  endpointAppContext: EndpointAppContext
) {
  const logger = getLogger(endpointAppContext);

  router.get(
    {
      path: HOST_METADATA_LIST_ROUTE,
      validate: GetMetadataListRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      logger,
      getMetadataListRequestHandler(endpointAppContext, logger)
    )
  );

  router.get(
    {
      path: HOST_METADATA_GET_ROUTE,
      validate: GetMetadataRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      logger,
      getMetadataRequestHandler(endpointAppContext, logger)
    )
  );

  router.get(
    {
      path: METADATA_TRANSFORMS_STATUS_ROUTE,
      validate: false,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      logger,
      getMetadataTransformStatsHandler(logger)
    )
  );
}
