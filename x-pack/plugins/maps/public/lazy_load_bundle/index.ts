/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsContract } from 'src/plugins/data/public/index_patterns';
import { AppMountParameters } from 'kibana/public';
import { IContainer } from '../../../../../src/plugins/embeddable/public';
import { LayerDescriptor } from '../../common/descriptor_types';
import type {
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableType,
} from '../embeddable/types';
import { SourceRegistryEntry } from '../classes/sources/source_registry';
import { LayerWizard } from '../classes/layers/layer_wizard_registry';
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
  registerLayerWizard: (layerWizard: LayerWizard) => void;
  registerSource(entry: SourceRegistryEntry): void;
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

  loadModulesPromise = new Promise(async (resolve) => {
    const {
      MapEmbeddable,
      getIndexPatternService,
      getMapsCapabilities,
      renderApp,
      createSecurityLayerDescriptors,
      registerLayerWizard,
      registerSource,
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
      registerLayerWizard,
      registerSource,
      createTileMapLayerDescriptor,
      createRegionMapLayerDescriptor,
      createBasemapLayerDescriptor,
      createESSearchSourceLayerDescriptor,
      suggestEMSTermJoinConfig,
    });
  });
  return loadModulesPromise;
}
