/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export async function getApmEventClient({
  context,
  params,
  config,
  getApmIndices,
  request,
}: Pick<
  MinimalAPMRouteHandlerResources,
  'context' | 'params' | 'config' | 'getApmIndices' | 'request'
>): Promise<APMEventClient> {
  return withApmSpan('get_apm_event_client', async () => {
    const coreContext = await context.core;
    const [indices, includeFrozen] = await Promise.all([
      getApmIndices(),
      withApmSpan('get_ui_settings', () =>
        coreContext.uiSettings.client.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN)
      ),
    ]);

    return new APMEventClient({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      debug: params.query._inspect,
      request,
      indices,
      options: {
        includeFrozen,
      },
    });
  });
}
