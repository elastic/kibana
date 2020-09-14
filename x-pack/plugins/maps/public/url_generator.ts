/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import rison from 'rison-node';
import {
  TimeRange,
  Filter,
  Query,
  esFilters,
  QueryState,
  RefreshInterval,
} from '../../../../src/plugins/data/public';
import { setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public';
import { LayerDescriptor } from '../common/descriptor_types';
import { INITIAL_LAYERS_KEY } from '../common/constants';

const STATE_STORAGE_KEY = '_a';
const GLOBAL_STATE_STORAGE_KEY = '_g';

export const MAPS_APP_URL_GENERATOR = 'MAPS_APP_URL_GENERATOR';

export interface MapsUrlGeneratorState {
  /**
   * If given, it will load the given map else will load the create a new map page.
   */
  mapId?: string;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the initial Layers.
   */
  initialLayers?: LayerDescriptor[];

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;

  /**
   * Optionally apply filers. NOTE: if given and used in conjunction with `mapId`, and the
   * saved map has filters saved with it, this will _replace_ those filters.
   */
  filters?: Filter[];
  /**
   * Optionally set a query. NOTE: if given and used in conjunction with `mapId`, and the
   * saved map has a query saved with it, this will _replace_ that query.
   */
  query?: Query;
  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  hash?: boolean;
}

export const createMapsUrlGenerator = (
  getStartServices: () => Promise<{
    appBasePath: string;
    useHashedUrl: boolean;
  }>
): UrlGeneratorsDefinition<typeof MAPS_APP_URL_GENERATOR> => ({
  id: MAPS_APP_URL_GENERATOR,
  createUrl: async ({
    mapId,
    filters,
    query,
    refreshInterval,
    timeRange,
    initialLayers,
    hash,
  }: MapsUrlGeneratorState): Promise<string> => {
    const startServices = await getStartServices();
    const useHash = hash ?? startServices.useHashedUrl;
    const appBasePath = startServices.appBasePath;

    const appState: {
      query?: Query;
      filters?: Filter[];
      vis?: unknown;
    } = {};
    const queryState: QueryState = {};

    if (query) appState.query = query;
    if (filters && filters.length)
      appState.filters = filters?.filter((f) => !esFilters.isFilterPinned(f));

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length)
      queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let url = `${appBasePath}/map#/${mapId || ''}`;
    url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
    url = setStateToKbnUrl(STATE_STORAGE_KEY, appState, { useHash }, url);

    if (initialLayers && initialLayers.length) {
      // @ts-ignore
      url = `${url}&${INITIAL_LAYERS_KEY}=${rison.encode_array(initialLayers)}`;
    }

    return url;
  },
});
