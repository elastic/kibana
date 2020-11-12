/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { LegacyAPICaller, IRouter } from 'src/core/server';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';

import { PipelineListItem } from '../../models/pipeline_list_item';
import { checkLicense } from '../../lib/check_license';

async function fetchPipelines(callWithRequest: LegacyAPICaller) {
  const params = {
    path: '/_logstash/pipeline',
    method: 'GET',
    ignore: [404],
  };

  return await callWithRequest('transport.request', params);
}

export function registerPipelinesListRoute(router: IRouter) {
  router.get(
    {
      path: '/api/logstash/pipelines',
      validate: false,
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        try {
          const client = context.logstash!.esClient;
          const pipelinesRecord = (await fetchPipelines(client.callAsCurrentUser)) as Record<
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
