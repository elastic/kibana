/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'src/core/server';
import type { LogstashPluginRouter } from '../../types';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';

import { PipelineListItem } from '../../models/pipeline_list_item';
import { checkLicense } from '../../lib/check_license';

async function fetchPipelines(client: ElasticsearchClient) {
  return await client.transport.request(
    {
      method: 'GET',
      path: '/_logstash/pipeline',
    },
    { ignore: [404] }
  );
}

export function registerPipelinesListRoute(router: LogstashPluginRouter) {
  router.get(
    {
      path: '/api/logstash/pipelines',
      validate: false,
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        try {
          const { client } = context.core.elasticsearch;
          const pipelinesRecord = (await fetchPipelines(client.asCurrentUser)) as Record<
            string,
            any
          >;

          const pipelines = Object.keys(pipelinesRecord)
            .sort()
            .map((key) => {
              return PipelineListItem.fromUpstreamJSON(key, pipelinesRecord).downstreamJSON;
            });

          return response.ok({ body: { pipelines } });
        } catch (err) {
          const statusCode = err.statusCode;
          // handles the permissions issue of Elasticsearch
          if (statusCode === 403) {
            return response.forbidden({
              body: i18n.translate('xpack.logstash.insufficientUserPermissionsDescription', {
                defaultMessage: 'Insufficient user permissions for managing Logstash pipelines',
              }),
            });
          }
          throw err;
        }
      })
    )
  );
}
