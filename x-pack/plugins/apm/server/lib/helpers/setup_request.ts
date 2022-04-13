/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActivePlatinumLicense } from '../../../common/license_check';
import { APMConfig } from '../..';
import { KibanaRequest } from '../../../../../../src/core/server';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { APMRouteHandlerResources } from '../../routes/typings';
import {
  ApmIndicesConfig,
  getApmIndices,
} from '../../routes/settings/apm_indices/get_apm_indices';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import {
  APMInternalClient,
  createInternalESClient,
} from './create_es_client/create_internal_es_client';
import { withApmSpan } from '../../utils/with_apm_span';

// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface Setup {
  apmEventClient: APMEventClient;
  internalClient: APMInternalClient;
  ml?: ReturnType<typeof getMlSetup>;
  config: APMConfig;
  indices: ApmIndicesConfig;
}

export async function setupRequest({
  context,
  params,
  core,
  plugins,
  request,
  config,
}: APMRouteHandlerResources) {
  return withApmSpan('setup_request', async () => {
    const { query } = params;
    const coreContext = await context.core;
    const licensingContext = await context.licensing;

    const [indices, includeFrozen] = await Promise.all([
      getApmIndices({
        savedObjectsClient: coreContext.savedObjects.client,
        config,
      }),
      withApmSpan('get_ui_settings', () =>
        coreContext.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN)
      ),
    ]);

    return {
      indices,
      apmEventClient: new APMEventClient({
        esClient: coreContext.elasticsearch.client.asCurrentUser,
        debug: query._inspect,
        request,
        indices,
        options: { includeFrozen },
      }),
      internalClient: await createInternalESClient({
        context,
        request,
        debug: query._inspect,
      }),
      ml:
        plugins.ml && isActivePlatinumLicense(licensingContext.license)
          ? getMlSetup(
              plugins.ml.setup,
              coreContext.savedObjects.client,
              request
            )
          : undefined,
      config,
    };
  });
}

function getMlSetup(
  ml: Required<APMRouteHandlerResources['plugins']>['ml']['setup'],
  savedObjectsClient: Awaited<
    APMRouteHandlerResources['context']['core']
  >['savedObjects']['client'],
  request: KibanaRequest
) {
  return {
    mlSystem: ml.mlSystemProvider(request, savedObjectsClient),
    anomalyDetectors: ml.anomalyDetectorsProvider(request, savedObjectsClient),
    modules: ml.modulesProvider(request, savedObjectsClient),
  };
}
