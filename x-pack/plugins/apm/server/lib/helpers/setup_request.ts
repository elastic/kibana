/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { KibanaRequest } from '../../../../../../src/core/server';
import { APMConfig } from '../..';
import {
  getApmIndices,
  ApmIndicesConfig,
} from '../settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../../typings/elasticsearch';
import { getUiFiltersES } from './convert_ui_filters/get_ui_filters_es';
import { APMRequestHandlerContext } from '../../routes/typings';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  APMEventClient,
  createApmEventClient,
} from './create_es_client/create_apm_event_client';
import {
  APMInternalClient,
  createInternalESClient,
} from './create_es_client/create_internal_es_client';

function decodeUiFilters(uiFiltersEncoded?: string) {
  if (!uiFiltersEncoded) {
    return [];
  }
  const uiFilters = JSON.parse(uiFiltersEncoded);
  return getUiFiltersES(uiFilters);
}
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

export interface SetupUIFilters {
  uiFiltersES: ESFilter[];
}

interface SetupRequestParams {
  query?: {
    _debug?: boolean;
    start?: string;
    end?: string;
    uiFilters?: string;
    processorEvent?: ProcessorEvent;
  };
}

type InferSetup<TParams extends SetupRequestParams> = Setup &
  (TParams extends { query: { start: string } } ? { start: number } : {}) &
  (TParams extends { query: { end: string } } ? { end: number } : {}) &
  (TParams extends { query: { uiFilters: string } }
    ? { uiFiltersES: ESFilter[] }
    : {});

export async function setupRequest<TParams extends SetupRequestParams>(
  context: APMRequestHandlerContext<TParams>,
  request: KibanaRequest
): Promise<InferSetup<TParams>> {
  const { config } = context;
  const { query } = context.params;

  const [indices, includeFrozen] = await Promise.all([
    getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config,
    }),
    context.core.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
  ]);

  const uiFiltersES = decodeUiFilters(query.uiFilters);

  const coreSetupRequest = {
    indices,
    apmEventClient: createApmEventClient({
      context,
      request,
      indices,
      options: { includeFrozen },
    }),
    internalClient: createInternalESClient({
      context,
      request,
    }),
    ml: getMlSetup(
      context.plugins.ml,
      context.core.savedObjects.client,
      request
    ),
    config,
  };

  return {
    ...('start' in query ? { start: moment.utc(query.start).valueOf() } : {}),
    ...('end' in query ? { end: moment.utc(query.end).valueOf() } : {}),
    ...('uiFilters' in query ? { uiFiltersES } : {}),
    ...coreSetupRequest,
  } as InferSetup<TParams>;
}

function getMlSetup(
  ml: APMRequestHandlerContext['plugins']['ml'],
  savedObjectsClient: APMRequestHandlerContext['core']['savedObjects']['client'],
  request: KibanaRequest
) {
  if (!ml) {
    return;
  }
  const mlClient = ml.mlClient.asScoped(request);
  const mlSystem = ml.mlSystemProvider(mlClient, request);
  return {
    mlClient,
    mlSystem,
    modules: ml.modulesProvider(mlClient, request, savedObjectsClient),
    anomalyDetectors: ml.anomalyDetectorsProvider(mlClient, request),
    mlAnomalySearch: mlSystem.mlAnomalySearch,
  };
}
