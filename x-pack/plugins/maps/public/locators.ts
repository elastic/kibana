/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import rison from 'rison-node';
import type { SerializableRecord } from '@kbn/utility-types';
import { type Filter, isFilterPinned } from '@kbn/es-query';
import type { TimeRange, Query, QueryState, RefreshInterval } from '@kbn/data-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { LayerDescriptor } from '../common/descriptor_types';
import { INITIAL_LAYERS_KEY, APP_ID } from '../common/constants';
import { lazyLoadMapModules } from './lazy_load_bundle';

export interface MapsAppLocatorParams extends SerializableRecord {
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
  initialLayers?: LayerDescriptor[] & SerializableRecord;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

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

export const MAPS_APP_LOCATOR = 'MAPS_APP_LOCATOR' as const;

export type MapsAppLocator = LocatorPublic<MapsAppLocatorParams>;

export interface MapsAppLocatorDependencies {
  useHash: boolean;
}

export class MapsAppLocatorDefinition implements LocatorDefinition<MapsAppLocatorParams> {
  public readonly id = MAPS_APP_LOCATOR;

  constructor(protected readonly deps: MapsAppLocatorDependencies) {}

  public readonly getLocation = async (params: MapsAppLocatorParams) => {
    const { mapId, filters, query, refreshInterval, timeRange, initialLayers, hash } = params;
    const useHash = hash ?? this.deps.useHash;
    const appState: {
      query?: Query;
      filters?: Filter[];
      vis?: unknown;
    } = {};
    const queryState: QueryState = {};

    if (query) appState.query = query;
    if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let path = `/map#/${mapId || ''}`;
    path = setStateToKbnUrl<QueryState>('_g', queryState, { useHash }, path);
    path = setStateToKbnUrl('_a', appState, { useHash }, path);

    if (initialLayers && initialLayers.length) {
      const risonEncodedInitialLayers = (
        rison as unknown as {
          encode_array: (
            initialLayers: (LayerDescriptor[] & SerializableRecord) | undefined
          ) => string;
        }
      ).encode_array(initialLayers);
      path = `${path}&${INITIAL_LAYERS_KEY}=${encodeURIComponent(risonEncodedInitialLayers)}`;
    }

    return {
      app: APP_ID,
      path,
      state: {},
    };
  };
}

export interface MapsAppTileMapLocatorParams extends SerializableRecord {
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
}

export type MapsAppTileMapLocator = LocatorPublic<MapsAppLocatorParams>;

export const MAPS_APP_TILE_MAP_LOCATOR = 'MAPS_APP_TILE_MAP_LOCATOR' as const;

export interface MapsAppTileMapLocatorDependencies {
  locator: MapsAppLocator;
}

export class MapsAppTileMapLocatorDefinition
  implements LocatorDefinition<MapsAppTileMapLocatorParams>
{
  public readonly id = MAPS_APP_TILE_MAP_LOCATOR;

  constructor(protected readonly deps: MapsAppTileMapLocatorDependencies) {}

  public readonly getLocation = async (params: MapsAppTileMapLocatorParams) => {
    const {
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
      hash = true,
    } = params;
    const mapModules = await lazyLoadMapModules();
    const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
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

    return await this.deps.locator.getLocation({
      initialLayers,
      filters,
      query,
      timeRange,
      hash,
    });
  };
}

export interface MapsAppRegionMapLocatorParams extends SerializableRecord {
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
}

export type MapsAppRegionMapLocator = LocatorPublic<MapsAppRegionMapLocatorParams>;

export const MAPS_APP_REGION_MAP_LOCATOR = 'MAPS_APP_REGION_MAP_LOCATOR' as const;

export interface MapsAppRegionMapLocatorDependencies {
  locator: MapsAppLocator;
}

export class MapsAppRegionMapLocatorDefinition
  implements LocatorDefinition<MapsAppRegionMapLocatorParams>
{
  public readonly id = MAPS_APP_REGION_MAP_LOCATOR;

  constructor(protected readonly deps: MapsAppRegionMapLocatorDependencies) {}

  public readonly getLocation = async (params: MapsAppRegionMapLocatorParams) => {
    const {
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
      hash = true,
    } = params;
    const mapModules = await lazyLoadMapModules();
    const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
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

    return await this.deps.locator.getLocation({
      initialLayers,
      filters,
      query,
      timeRange,
      hash,
    });
  };
}
