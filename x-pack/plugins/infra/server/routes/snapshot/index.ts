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
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { SnapshotRequestRT, SnapshotNodeResponseRT } from '../../../common/http_api/snapshot_api';
import { throwErrors } from '../../../common/runtime_types';
import { createSearchClient } from '../../lib/create_search_client';
import { getNodes } from './lib/get_nodes';

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
        const snapshotRequest = pipe(
          SnapshotRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const source = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          snapshotRequest.sourceId
        );

        UsageCollector.countNode(snapshotRequest.nodeType);
        const client = createSearchClient(requestContext, framework);
        const snapshotResponse = await getNodes(client, snapshotRequest, source);

        return response.ok({
          body: SnapshotNodeResponseRT.encode(snapshotResponse),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
