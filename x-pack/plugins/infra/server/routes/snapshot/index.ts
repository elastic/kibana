/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { SnapshotRequestRT, SnapshotNodeResponseRT } from '../../../common/http_api/snapshot_api';
import { throwErrors } from '../../../common/runtime_types';
import { createSearchClient } from '../../lib/create_search_client';
import { getNodes } from './lib/get_nodes';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const { framework, handleEsError } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/snapshot',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      const snapshotRequest = pipe(
        SnapshotRequestRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const source = await libs.sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        snapshotRequest.sourceId
      );
      const compositeSize = libs.configuration.inventory.compositeSize;
      const logQueryFields = await libs.getLogQueryFields(
        snapshotRequest.sourceId,
        requestContext.core.savedObjects.client
      );

      UsageCollector.countNode(snapshotRequest.nodeType);
      const client = createSearchClient(requestContext, framework);

      try {
        const snapshotResponse = await getNodes(
          client,
          snapshotRequest,
          source,
          logQueryFields,
          compositeSize
        );
        return response.ok({
          body: SnapshotNodeResponseRT.encode(snapshotResponse),
        });
      } catch (err) {
        // temporary until handleEsError handles the case where body.error.reason: ''
        // OR elasticsearch fixes it https://github.com/elastic/kibana/issues/96640
        if (err.name === 'ResponseError') {
          const { body } = err as ResponseError;
          if (!body.error?.reason) {
            body.error.reason = body.error.caused_by?.reason;
          }
        }
        return handleEsError({ error: err, response });
      }
    }
  );
};
