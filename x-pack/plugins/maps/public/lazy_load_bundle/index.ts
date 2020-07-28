/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsService } from 'src/plugins/data/public/index_patterns';
import { ReactElement } from 'react';
import { Embeddable, IContainer } from '../../../../../src/plugins/embeddable/public';
import { LayerDescriptor } from '../../common/descriptor_types';
import { MapStore, MapStoreState } from '../reducers/store';
import { EventHandlers } from '../reducers/non_serializable_instances';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import { MapEmbeddableConfig, MapEmbeddableInput, MapEmbeddableOutput } from '../embeddable/types';
import { SourceRegistryEntry } from '../classes/sources/source_registry';
import { LayerWizard } from '../classes/layers/layer_wizard_registry';

let loadModulesPromise: Promise<LazyLoadedMapModules>;

interface LazyLoadedMapModules {
  getMapsSavedObjectLoader: any;
  MapEmbeddable: new (
    config: MapEmbeddableConfig,
    initialInput: MapEmbeddableInput,
    parent?: IContainer,
    renderTooltipContent?: RenderToolTipContent,
    eventHandlers?: EventHandlers
  ) => Embeddable<MapEmbeddableInput, MapEmbeddableOutput>;
  getIndexPatternService: () => IndexPatternsService;
  getHttp: () => any;
  getMapsCapabilities: () => any;
  createMapStore: () => MapStore;
  addLayerWithoutDataSync: (layerDescriptor: LayerDescriptor) => AnyAction;
  getQueryableUniqueIndexPatternIds: (state: MapStoreState) => string[];
  getInitialLayers: (
    layerListJSON?: string,
    initialLayers?: LayerDescriptor[]
  ) => LayerDescriptor[];
  mergeInputWithSavedMap: any;
  renderApp: (context: unknown, params: unknown) => ReactElement<any>;
  createSecurityLayerDescriptors: (
    indexPatternId: string,
    indexPatternTitle: string
  ) => LayerDescriptor[];
  registerLayerWizard(layerWizard: LayerWizard): void;
  registerSource(entry: SourceRegistryEntry): void;
}

export async function lazyLoadMapModules(): Promise<LazyLoadedMapModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve) => {
    const {
      // @ts-expect-error
      getMapsSavedObjectLoader,
      getQueryableUniqueIndexPatternIds,
      MapEmbeddable,
      getIndexPatternService,
      getHttp,
      getMapsCapabilities,
      createMapStore,
      addLayerWithoutDataSync,
      getInitialLayers,
      mergeInputWithSavedMap,
      // @ts-expect-error
      renderApp,
      createSecurityLayerDescriptors,
      registerLayerWizard,
      registerSource,
    } = await import('./lazy');

    resolve({
      getMapsSavedObjectLoader,
      getQueryableUniqueIndexPatternIds,
      MapEmbeddable,
      getIndexPatternService,
      getHttp,
      getMapsCapabilities,
      createMapStore,
      addLayerWithoutDataSync,
      getInitialLayers,
      mergeInputWithSavedMap,
      renderApp,
      createSecurityLayerDescriptors,
      registerLayerWizard,
      registerSource,
    });
  });
  return loadModulesPromise;
}
