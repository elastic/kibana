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
  getMetadataListRequestHandler,
  getMetadataRequestHandler,
  getMetadataListRequestHandlerV2,
} from './handlers';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../common/endpoint/constants';

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

export const GetMetadataListRequestSchema = {
  body: schema.nullable(
    schema.object({
      paging_properties: schema.nullable(
        schema.arrayOf(
          schema.oneOf([
            /**
             * the number of results to return for this request per page
             */
            schema.object({
              page_size: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
            }),
            /**
             * the zero based page index of the the total number of pages of page size
             */
            schema.object({ page_index: schema.number({ defaultValue: 0, min: 0 }) }),
          ])
        )
      ),
      filters: endpointFilters,
    })
  ),
};

export const GetMetadataListRequestSchemaV2 = {
  query: schema.object({
    page: schema.number({ defaultValue: 0 }),
    pageSize: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
    kuery: schema.maybe(schema.string()),
    hostStatuses: schema.arrayOf(
      schema.oneOf([
        schema.literal(HostStatus.HEALTHY.toString()),
        schema.literal(HostStatus.OFFLINE.toString()),
        schema.literal(HostStatus.UPDATING.toString()),
        schema.literal(HostStatus.UNHEALTHY.toString()),
        schema.literal(HostStatus.INACTIVE.toString()),
      ]),
      { defaultValue: [] }
    ),
  }),
};

export function registerEndpointRoutes(
  router: SecuritySolutionPluginRouter,
  endpointAppContext: EndpointAppContext
) {
  const logger = getLogger(endpointAppContext);

  router.get(
    {
      path: HOST_METADATA_LIST_ROUTE,
      validate: GetMetadataListRequestSchemaV2,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataListRequestHandlerV2(endpointAppContext, logger)
  );

  router.get(
    {
      path: HOST_METADATA_GET_ROUTE,
      validate: GetMetadataRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataRequestHandler(endpointAppContext, logger)
  );

  router.post(
    {
      path: HOST_METADATA_LIST_ROUTE,
      validate: GetMetadataListRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataListRequestHandler(endpointAppContext, logger)
  );
}
