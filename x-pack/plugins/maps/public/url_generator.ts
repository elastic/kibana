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
import { lazyLoadMapModules } from './lazy_load_bundle';

const STATE_STORAGE_KEY = '_a';
const GLOBAL_STATE_STORAGE_KEY = '_g';

export const MAPS_APP_URL_GENERATOR = 'MAPS_APP_URL_GENERATOR';
export const MAPS_APP_TILE_MAP_URL_GENERATOR = 'MAPS_APP_TILE_MAP_URL_GENERATOR';
export const MAPS_APP_REGION_MAP_URL_GENERATOR = 'MAPS_APP_REGION_MAP_URL_GENERATOR';

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

type GetStartServices = () => Promise<{
  appBasePath: string;
  useHashedUrl: boolean;
}>;

async function createMapUrl({
  getStartServices,
  mapId,
  filters,
  query,
  refreshInterval,
  timeRange,
  initialLayers,
  hash,
}: MapsUrlGeneratorState & { getStartServices: GetStartServices }): Promise<string> {
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
    const risonEncodedInitialLayers = rison.encode_array(initialLayers);
    url = `${url}&${INITIAL_LAYERS_KEY}=${encodeURIComponent(risonEncodedInitialLayers)}`;
  }

  return url;
}

export const createMapsUrlGenerator = (
  getStartServices: GetStartServices
): UrlGeneratorsDefinition<typeof MAPS_APP_URL_GENERATOR> => ({
  id: MAPS_APP_URL_GENERATOR,
  createUrl: async (mapsUrlGeneratorState: MapsUrlGeneratorState): Promise<string> => {
    return createMapUrl({ ...mapsUrlGeneratorState, getStartServices });
  },
});

export const createTileMapUrlGenerator = (
  getStartServices: GetStartServices
): UrlGeneratorsDefinition<typeof MAPS_APP_TILE_MAP_URL_GENERATOR> => ({
  id: MAPS_APP_TILE_MAP_URL_GENERATOR,
  createUrl: async ({
    label,
    mapType,
    colorSchema,
    indexPatternId,
    geoFieldName,
    metricAgg,
    metricFieldName,
    filters,
    query,
    timeRange,
    hash,
  }: {
    label: string;
    mapType: string;
    colorSchema: string;
    indexPatternId?: string;
    geoFieldName?: string;
    metricAgg: string;
    metricFieldName?: string;
    timeRange?: TimeRange;
    filters?: Filter[];
    query?: Query;
    hash?: boolean;
  }): Promise<string> => {
    const mapModules = await lazyLoadMapModules();
    const initialLayers = [];
    const tileMapLayerDescriptor = mapModules.createTileMapLayerDescriptor({
      label,
      mapType,
      colorSchema,
      indexPatternId,
      geoFieldName,
      metricAgg,
      metricFieldName,
    });
    if (tileMapLayerDescriptor) {
      initialLayers.push(tileMapLayerDescriptor);
    }

    return createMapUrl({
      initialLayers,
      filters,
      query,
      timeRange,
      hash: true,
      getStartServices,
    });
  },
});

export const createRegionMapUrlGenerator = (
  getStartServices: GetStartServices
): UrlGeneratorsDefinition<typeof MAPS_APP_REGION_MAP_URL_GENERATOR> => ({
  id: MAPS_APP_REGION_MAP_URL_GENERATOR,
  createUrl: async ({
    label,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    termsSize,
    colorSchema,
    indexPatternId,
    indexPatternTitle,
    metricAgg,
    metricFieldName,
    filters,
    query,
    timeRange,
    hash,
  }: {
    label: string;
    emsLayerId?: string;
    leftFieldName?: string;
    termsFieldName?: string;
    termsSize?: number;
    colorSchema: string;
    indexPatternId?: string;
    indexPatternTitle?: string;
    metricAgg: string;
    metricFieldName?: string;
    timeRange?: TimeRange;
    filters?: Filter[];
    query?: Query;
    hash?: boolean;
  }): Promise<string> => {
    const mapModules = await lazyLoadMapModules();
    const initialLayers = [];
    const regionMapLayerDescriptor = mapModules.createRegionMapLayerDescriptor({
      label,
      emsLayerId,
      leftFieldName,
      termsFieldName,
      termsSize,
      colorSchema,
      indexPatternId,
      indexPatternTitle,
      metricAgg,
      metricFieldName,
    });
    if (regionMapLayerDescriptor) {
      initialLayers.push(regionMapLayerDescriptor);
    }

    return createMapUrl({
      initialLayers,
      filters,
      query,
      timeRange,
      hash: true,
      getStartServices,
    });
  },
});
