/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { HostStatus, MetadataQueryStrategyVersions } from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import { getLogger, getMetadataListRequestHandler, getMetadataRequestHandler } from './handlers';

export const BASE_ENDPOINT_ROUTE = '/api/endpoint';
export const METADATA_REQUEST_V1_ROUTE = `${BASE_ENDPOINT_ROUTE}/v1/metadata`;
export const GET_METADATA_REQUEST_V1_ROUTE = `${METADATA_REQUEST_V1_ROUTE}/{id}`;
export const METADATA_REQUEST_ROUTE = `${BASE_ENDPOINT_ROUTE}/metadata`;
export const GET_METADATA_REQUEST_ROUTE = `${METADATA_REQUEST_ROUTE}/{id}`;

/* Filters that can be applied to the endpoint fetch route */
export const endpointFilters = schema.object({
  kql: schema.nullable(schema.string()),
  host_status: schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(HostStatus.ONLINE.toString()),
        schema.literal(HostStatus.OFFLINE.toString()),
        schema.literal(HostStatus.UNENROLLING.toString()),
        schema.literal(HostStatus.ERROR.toString()),
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

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const logger = getLogger(endpointAppContext);
  router.post(
    {
      path: `${METADATA_REQUEST_V1_ROUTE}`,
      validate: GetMetadataListRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataListRequestHandler(
      endpointAppContext,
      logger,
      MetadataQueryStrategyVersions.VERSION_1
    )
  );

  router.post(
    {
      path: `${METADATA_REQUEST_ROUTE}`,
      validate: GetMetadataListRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataListRequestHandler(endpointAppContext, logger)
  );

  router.get(
    {
      path: `${GET_METADATA_REQUEST_V1_ROUTE}`,
      validate: GetMetadataRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataRequestHandler(endpointAppContext, logger, MetadataQueryStrategyVersions.VERSION_1)
  );

  router.get(
    {
      path: `${GET_METADATA_REQUEST_ROUTE}`,
      validate: GetMetadataRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    getMetadataRequestHandler(endpointAppContext, logger)
  );
}
