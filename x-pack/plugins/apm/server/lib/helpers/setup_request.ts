/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { APMConfig } from '../..';
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

    const [indices, includeFrozen] = await Promise.all([
      getApmIndices({
        savedObjectsClient: context.core.savedObjects.client,
        config,
      }),
      withApmSpan('get_ui_settings', () =>
        context.core.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN)
      ),
    ]);

    return {
      indices,
      apmEventClient: new APMEventClient({
        esClient: context.core.elasticsearch.client.asCurrentUser,
        debug: query._inspect,
        request,
        indices,
        options: { includeFrozen },
      }),
      internalClient: createInternalESClient({
        context,
        request,
        debug: query._inspect,
      }),
      ml:
        plugins.ml && isActivePlatinumLicense(context.licensing.license)
          ? getMlSetup(
              plugins.ml.setup,
              context.core.savedObjects.client,
              request
            )
          : undefined,
      config,
    };
  });
}

function getMlSetup(
  ml: Required<APMRouteHandlerResources['plugins']>['ml']['setup'],
  savedObjectsClient: APMRouteHandlerResources['context']['core']['savedObjects']['client'],
  request: KibanaRequest
) {
  return {
    mlSystem: ml.mlSystemProvider(request, savedObjectsClient),
    anomalyDetectors: ml.anomalyDetectorsProvider(request, savedObjectsClient),
    modules: ml.modulesProvider(request, savedObjectsClient),
  };
}
