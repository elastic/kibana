/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { SnapshotRequestRT, SnapshotNodeResponseRT } from '../../../common/http_api/snapshot_api';
import { throwErrors } from '../../../common/runtime_types';
import { createSearchClient } from '../../lib/create_search_client';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/snapshot',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const {
          filterQuery,
          nodeType,
          groupBy,
          sourceId,
          metrics,
          timerange,
          accountId,
          region,
          includeTimeseries,
          overrideCompositeSize,
        } = pipe(
          SnapshotRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const source = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );
        UsageCollector.countNode(nodeType);
        const options = {
          filterQuery: parseFilterQuery(filterQuery),
          accountId,
          region,
          nodeType,
          groupBy,
          sourceConfiguration: source.configuration,
          metrics,
          timerange,
          includeTimeseries,
          overrideCompositeSize,
        };

        const client = createSearchClient(requestContext, framework);
        const nodesWithInterval = await libs.snapshot.getNodes(client, options);
        return response.ok({
          body: SnapshotNodeResponseRT.encode(nodesWithInterval),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
