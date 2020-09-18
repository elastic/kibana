/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { SearchResponse } from 'elasticsearch';
import { LegacyAPICaller, IRouter } from 'src/core/server';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';

import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../common/constants';
import { PipelineListItem } from '../../models/pipeline_list_item';
import { fetchAllFromScroll } from '../../lib/fetch_all_from_scroll';
import { checkLicense } from '../../lib/check_license';

async function fetchPipelines(callWithRequest: LegacyAPICaller) {
  const params = {
    index: INDEX_NAMES.PIPELINES,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
    },
    ignore: [404],
  };

  const response = await callWithRequest<SearchResponse<any>>('search', params);
  return fetchAllFromScroll(response, callWithRequest);
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
          const pipelinesHits = await fetchPipelines(client.callAsCurrentUser);

          const pipelines = pipelinesHits.map((pipeline) => {
            return PipelineListItem.fromUpstreamJSON(pipeline).downstreamJSON;
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
