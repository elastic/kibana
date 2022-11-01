/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { APMRouteHandlerResources } from '../../routes/typings';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';

export async function getApmEventClient({
  context,
  params,
  config,
  request,
}: APMRouteHandlerResources): Promise<APMEventClient> {
  return withApmSpan('get_apm_event_client', async () => {
    const coreContext = await context.core;
    const [indices, includeFrozen] = await Promise.all([
      getApmIndices({
        savedObjectsClient: coreContext.savedObjects.client,
        config,
      }),
      withApmSpan('get_ui_settings', () =>
        coreContext.uiSettings.client.get<boolean>(
          UI_SETTINGS.SEARCH_INCLUDE_FROZEN
        )
      ),
    ]);

    return new APMEventClient({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      debug: params.query._inspect,
      request,
      indices,
      options: {
        includeFrozen,
        forceSyntheticSource: config.forceSyntheticSource,
      },
    });
  });
}
