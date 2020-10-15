/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Logger } from 'kibana/server';
import { isActivePlatinumLicense } from '../../../common/service_map';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { KibanaRequest } from '../../../../../../src/core/server';
import { APMConfig } from '../..';
import {
  getApmIndices,
  ApmIndicesConfig,
} from '../settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../../typings/elasticsearch';
import { getEsFilter } from './convert_ui_filters/get_es_filter';
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
import { UIFilters } from '../../../typings/ui_filters';

// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface Setup {
  apmEventClient: APMEventClient;
  internalClient: APMInternalClient;
  ml?: ReturnType<typeof getMlSetup>;
  config: APMConfig;
  indices: ApmIndicesConfig;
  uiFilters: UIFilters;
  esFilter: ESFilter[];
}

export interface SetupTimeRange {
  start: number;
  end: number;
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
  (TParams extends { query: { end: string } } ? { end: number } : {});

export async function setupRequest<TParams extends SetupRequestParams>(
  context: APMRequestHandlerContext<TParams>,
  request: KibanaRequest
): Promise<InferSetup<TParams>> {
  const { config, logger } = context;
  const { query } = context.params;

  const [indices, includeFrozen] = await Promise.all([
    getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config,
    }),
    context.core.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
  ]);

  const uiFilters = decodeUiFilters(logger, query.uiFilters);

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
    ml:
      context.plugins.ml && isActivePlatinumLicense(context.licensing.license)
        ? getMlSetup(
            context.plugins.ml,
            context.core.savedObjects.client,
            request
          )
        : undefined,
    config,
    uiFilters,
    esFilter: getEsFilter(uiFilters),
  };

  return {
    ...('start' in query ? { start: moment.utc(query.start).valueOf() } : {}),
    ...('end' in query ? { end: moment.utc(query.end).valueOf() } : {}),
    ...coreSetupRequest,
  } as InferSetup<TParams>;
}

function getMlSetup(
  ml: Required<APMRequestHandlerContext['plugins']>['ml'],
  savedObjectsClient: APMRequestHandlerContext['core']['savedObjects']['client'],
  request: KibanaRequest
) {
  return {
    mlSystem: ml.mlSystemProvider(request),
    anomalyDetectors: ml.anomalyDetectorsProvider(request),
    modules: ml.modulesProvider(request, savedObjectsClient),
  };
}

function decodeUiFilters(logger: Logger, uiFiltersEncoded?: string): UIFilters {
  if (!uiFiltersEncoded) {
    return {};
  }
  try {
    return JSON.parse(uiFiltersEncoded);
  } catch (error) {
    logger.error(error);
    return {};
  }
}
