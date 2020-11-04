/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsContract } from 'src/plugins/data/public/index_patterns';
import { AppMountParameters } from 'kibana/public';
import { Embeddable, IContainer } from '../../../../../src/plugins/embeddable/public';
import { LayerDescriptor } from '../../common/descriptor_types';
import { MapEmbeddableConfig, MapEmbeddableInput, MapEmbeddableOutput } from '../embeddable/types';
import { SourceRegistryEntry } from '../classes/sources/source_registry';
import { LayerWizard } from '../classes/layers/layer_wizard_registry';

let loadModulesPromise: Promise<LazyLoadedMapModules>;

interface LazyLoadedMapModules {
  MapEmbeddable: new (
    config: MapEmbeddableConfig,
    initialInput: MapEmbeddableInput,
    parent?: IContainer
  ) => Embeddable<MapEmbeddableInput, MapEmbeddableOutput>;
  getIndexPatternService: () => IndexPatternsContract;
  getMapsCapabilities: () => any;
  renderApp: (params: AppMountParameters) => Promise<() => void>;
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
  }: {
    label: string;
    mapType: string;
    colorSchema: string;
    indexPatternId?: string;
    geoFieldName?: string;
    metricAgg: string;
    metricFieldName?: string;
  }) => LayerDescriptor | null;
  createRegionMapLayerDescriptor: ({
    label,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    colorSchema,
    indexPatternId,
    indexPatternTitle,
    metricAgg,
    metricFieldName,
  }: {
    label: string;
    emsLayerId?: string;
    leftFieldName?: string;
    termsFieldName?: string;
    colorSchema: string;
    indexPatternId?: string;
    indexPatternTitle?: string;
    metricAgg: string;
    metricFieldName?: string;
  }) => LayerDescriptor | null;
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
    });
  });
  return loadModulesPromise;
}
