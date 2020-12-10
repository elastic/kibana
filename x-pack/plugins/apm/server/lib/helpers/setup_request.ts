/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import moment from 'moment';
import { APMConfig } from '../..';
import { KibanaRequest } from '../../../../../../src/core/server';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { ESFilter } from '../../../../../typings/elasticsearch';
import { isActivePlatinumLicense } from '../../../common/service_map';
import { UIFilters } from '../../../typings/ui_filters';
import { APMRequestHandlerContext } from '../../routes/typings';
import {
  ApmIndicesConfig,
  getApmIndices,
} from '../settings/apm_indices/get_apm_indices';
import { getEsFilter } from './convert_ui_filters/get_es_filter';
import {
  APMEventClient,
  createApmEventClient,
} from './create_es_client/create_apm_event_client';
import {
  APMInternalClient,
  createInternalESClient,
} from './create_es_client/create_internal_es_client';

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

    /**
     * Timestamp in ms since epoch
     */
    start?: string;

    /**
     * Timestamp in ms since epoch
     */
    end?: string;
    uiFilters?: string;
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
      esClient: context.core.elasticsearch.legacy.client,
      debug: context.params.query._debug,
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
    mlSystem: ml.mlSystemProvider(request, savedObjectsClient),
    anomalyDetectors: ml.anomalyDetectorsProvider(request, savedObjectsClient),
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
