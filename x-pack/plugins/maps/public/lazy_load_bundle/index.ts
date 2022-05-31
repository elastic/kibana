/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternsContract } from '@kbn/data-plugin/public';
import { AppMountParameters } from '@kbn/core/public';
import { IContainer } from '@kbn/embeddable-plugin/public';
import { LayerDescriptor } from '../../common/descriptor_types';
import type {
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableType,
} from '../embeddable/types';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';
import type { EMSTermJoinConfig, SampleValuesConfig } from '../ems_autosuggest';
import type { CreateTileMapLayerDescriptorParams } from '../classes/layers/create_tile_map_layer_descriptor';
import type { CreateRegionMapLayerDescriptorParams } from '../classes/layers/create_region_map_layer_descriptor';

let loadModulesPromise: Promise<LazyLoadedMapModules>;

export interface LazyLoadedMapModules {
  MapEmbeddable: new (
    config: MapEmbeddableConfig,
    initialInput: MapEmbeddableInput,
    parent?: IContainer
  ) => MapEmbeddableType;
  getIndexPatternService: () => IndexPatternsContract;
  getMapsCapabilities: () => any;
  renderApp: (params: AppMountParameters, AppUsageTracker: React.FC) => Promise<() => void>;
  createSecurityLayerDescriptors: (
    indexPatternId: string,
    indexPatternTitle: string
  ) => LayerDescriptor[];
  createTileMapLayerDescriptor: ({
    label,
    mapType,
    colorSchema,
    indexPatternId,
    geoFieldName,
    metricAgg,
    metricFieldName,
  }: CreateTileMapLayerDescriptorParams) => LayerDescriptor | null;
  createRegionMapLayerDescriptor: ({
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
  }: CreateRegionMapLayerDescriptorParams) => LayerDescriptor | null;
  createBasemapLayerDescriptor: () => LayerDescriptor | null;
  createESSearchSourceLayerDescriptor: (params: CreateLayerDescriptorParams) => LayerDescriptor;
  suggestEMSTermJoinConfig: (config: SampleValuesConfig) => Promise<EMSTermJoinConfig | null>;
}

export async function lazyLoadMapModules(): Promise<LazyLoadedMapModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve, reject) => {
    try {
      const {
        MapEmbeddable,
        getIndexPatternService,
        getMapsCapabilities,
        renderApp,
        createSecurityLayerDescriptors,
        createTileMapLayerDescriptor,
        createRegionMapLayerDescriptor,
        createBasemapLayerDescriptor,
        createESSearchSourceLayerDescriptor,
        suggestEMSTermJoinConfig,
      } = await import('./lazy');
      resolve({
        MapEmbeddable,
        getIndexPatternService,
        getMapsCapabilities,
        renderApp,
        createSecurityLayerDescriptors,
        createTileMapLayerDescriptor,
        createRegionMapLayerDescriptor,
        createBasemapLayerDescriptor,
        createESSearchSourceLayerDescriptor,
        suggestEMSTermJoinConfig,
      });
    } catch (error) {
      reject(error);
    }
  });
  return loadModulesPromise;
}
