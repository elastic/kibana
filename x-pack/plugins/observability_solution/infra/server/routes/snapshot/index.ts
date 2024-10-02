/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { SNAPSHOT_API_MAX_METRICS } from '../../../common/constants';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { SnapshotRequestRT, SnapshotNodeResponseRT } from '../../../common/http_api/snapshot_api';
import { createSearchClient } from '../../lib/create_search_client';
import { getNodes } from './lib/get_nodes';
import { LogQueryFields } from '../../lib/metrics/types';

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const validateBody = createRouteValidationFunction(SnapshotRequestRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/snapshot',
      validate: {
        body: validateBody,
      },
    },
    async (requestContext, request, response) => {
      const snapshotRequest = request.body;

      try {
        if (snapshotRequest.metrics.length > SNAPSHOT_API_MAX_METRICS) {
          throw Boom.badRequest(
            `'metrics' size is greater than maximum of ${SNAPSHOT_API_MAX_METRICS} allowed.`
          );
        }

        const soClient = (await requestContext.core).savedObjects.client;
        const source = await libs.sources.getSourceConfiguration(
          soClient,
          snapshotRequest.sourceId
        );
        const compositeSize = libs.configuration.inventory.compositeSize;
        const [, { logsShared }] = await libs.getStartServices();
        const logQueryFields: LogQueryFields | undefined = await logsShared.logViews
          .getScopedClient(request)
          .getResolvedLogView({
            type: 'log-view-reference',
            logViewId: snapshotRequest.sourceId,
          })
          .then(
            ({ indices }) => ({ indexPattern: indices }),
            () => undefined
          );

        UsageCollector.countNode(snapshotRequest.nodeType);
        const client = createSearchClient(requestContext, framework, request);

        const snapshotResponse = await getNodes(
          client,
          snapshotRequest,
          source,
          compositeSize,
          logQueryFields
        );
        return response.ok({
          body: SnapshotNodeResponseRT.encode(snapshotResponse),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? err,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
