/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import { kibanaRequestToMetadataListESQuery, metadataQueryConfigV1 } from './query_builders';
import { HostMetadata, HostStatus } from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import { findAllUnenrolledAgentIds } from './support/unenroll';
import { findAgentIDsByStatus } from './support/agent_status';
import { getHostData, mapToHostResultList, MetadataRequestContext } from './handlers';

/**
 * 00000000-0000-0000-0000-000000000000 is initial Elastic Agent id sent by Endpoint before policy is configured
 * 11111111-1111-1111-1111-111111111111 is Elastic Agent id sent by Endpoint when policy does not contain an id
 */

const IGNORED_ELASTIC_AGENT_IDS = [
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
];

const getLogger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('metadata');
};

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

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const logger = getLogger(endpointAppContext);
  router.post(
    {
      path: '/api/endpoint/metadata',
      validate: {
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
      },
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    async (context, req, res) => {
      try {
        const agentService = endpointAppContext.service.getAgentService();
        if (agentService === undefined) {
          throw new Error('agentService not available');
        }

        const metadataRequestContext: MetadataRequestContext = {
          agentService,
          logger,
          requestHandlerContext: context,
        };

        const unenrolledAgentIds = await findAllUnenrolledAgentIds(
          agentService,
          context.core.savedObjects.client
        );

        const statusIDs = req.body?.filters?.host_status?.length
          ? await findAgentIDsByStatus(
              agentService,
              context.core.savedObjects.client,
              req.body?.filters?.host_status
            )
          : undefined;

        const queryParams = await kibanaRequestToMetadataListESQuery(
          req,
          endpointAppContext,
          metadataQueryConfigV1(),
          {
            unenrolledAgentIds: unenrolledAgentIds.concat(IGNORED_ELASTIC_AGENT_IDS),
            statusAgentIDs: statusIDs,
          }
        );

        const response = (await context.core.elasticsearch.legacy.client.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<HostMetadata>;

        return res.ok({
          body: await mapToHostResultList(queryParams, response, metadataRequestContext),
        });
      } catch (err) {
        logger.warn(JSON.stringify(err, null, 2));
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/metadata/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    async (context, req, res) => {
      const agentService = endpointAppContext.service.getAgentService();
      if (agentService === undefined) {
        return res.internalError({ body: 'agentService not available' });
      }

      const metadataRequestContext: MetadataRequestContext = {
        agentService,
        logger,
        requestHandlerContext: context,
      };

      try {
        const doc = await getHostData(metadataRequestContext, req.params.id);
        if (doc) {
          return res.ok({ body: doc });
        }
        return res.notFound({ body: 'Endpoint Not Found' });
      } catch (err) {
        logger.warn(JSON.stringify(err, null, 2));
        if (err.isBoom) {
          return res.customError({
            statusCode: err.output.statusCode,
            body: { message: err.message },
          });
        }
        return res.internalError({ body: err });
      }
    }
  );
}
