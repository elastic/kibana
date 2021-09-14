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
} from '../settings/apm_indices/get_apm_indices';
import {
  APMEventClient,
  createApmEventClient,
} from './create_es_client/create_apm_event_client';
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

export interface SetupTimeRange {
  start: number;
  end: number;
}

export interface SetupRequestParams {
  query: {
    _inspect?: boolean;

    /**
     * Timestamp in ms since epoch
     */
    start?: number;

    /**
     * Timestamp in ms since epoch
     */
    end?: number;
  };
}

type InferSetup<TParams extends SetupRequestParams> = Setup &
  (TParams extends { query: { start: number } } ? { start: number } : {}) &
  (TParams extends { query: { end: number } } ? { end: number } : {}) &
  (TParams extends { query: Partial<SetupTimeRange> }
    ? Partial<SetupTimeRange>
    : {});

export async function setupRequest<TParams extends SetupRequestParams>({
  context,
  params,
  core,
  plugins,
  request,
  config,
}: APMRouteHandlerResources & {
  params: TParams;
}): Promise<InferSetup<TParams>> {
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

    const coreSetupRequest = {
      indices,
      apmEventClient: createApmEventClient({
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

    return {
      ...('start' in query ? { start: query.start } : {}),
      ...('end' in query ? { end: query.end } : {}),
      ...coreSetupRequest,
    } as InferSetup<TParams>;
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
