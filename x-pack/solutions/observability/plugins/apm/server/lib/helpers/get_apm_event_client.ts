/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import { getProjectRoutingFromRequest } from '@kbn/observability-utils-server/es/get_project_routing_from_request';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
import { inspectableEsQueriesMap } from '../../routes/apm_routes/register_apm_server_routes';

export async function getApmEventClient({
  context,
  core,
  params,
  getApmIndices,
  request,
}: Pick<
  MinimalAPMRouteHandlerResources,
  'context' | 'core' | 'params' | 'getApmIndices' | 'request'
>): Promise<APMEventClient> {
  return withApmSpan('get_apm_event_client', async () => {
    const coreContext = await context.core;
    const [indices, uiSettings, coreStart] = await Promise.all([
      getApmIndices(),
      withApmSpan('get_ui_settings', async () => {
        const includeFrozen = await coreContext.uiSettings.client.get<boolean>(
          UI_SETTINGS.SEARCH_INCLUDE_FROZEN
        );
        const excludedDataTiers = await coreContext.uiSettings.client.get<DataTier[]>(
          searchExcludedDataTiers
        );

        return { includeFrozen, excludedDataTiers };
      }),
      core.start(),
    ]);

    const headerProjectRouting = getProjectRoutingFromRequest(request);
    const elasticsearchClusterClient = coreStart.elasticsearch.client;
    // Rule UIs may omit `x-project-routing`; align with alerting by using the space NPRE when absent.
    const scopedClusterClient = headerProjectRouting
      ? elasticsearchClusterClient.asScoped(request)
      : elasticsearchClusterClient.asScoped(request, { projectRouting: 'space' });

    return new APMEventClient({
      esClient: scopedClusterClient.asCurrentUser,
      debug: params.query._inspect,
      request,
      indices,
      options: {
        includeFrozen: uiSettings.includeFrozen,
        excludedDataTiers: uiSettings.excludedDataTiers,
        inspectableEsQueriesMap,
        projectRouting: headerProjectRouting,
      },
    });
  });
}
