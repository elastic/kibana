/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../src/plugins/embeddable/public';
import '../index.scss';
import { createMapPath, MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';

let whenModulesLoadedPromise = null;

let getMapsSavedObjectLoader = null;
let MapEmbeddable;
let MapEmbeddableInput = null;
let getIndexPatternService;
let getHttp;
let getMapsCapabilities = null;
let createMapStore = null;
let addLayerWithoutDataSync = null;
let getQueryableUniqueIndexPatternIds = null;
let getInitialLayers = null;
let mergeInputWithSavedMap = null;

async function waitForMapDependencies() {
  if (whenModulesLoadedPromise !== null) {
    return whenModulesLoadedPromise;
  }

  whenModulesLoadedPromise = new Promise(async resolve => {
    const lazyModule = await import('./lazy');

    getMapsSavedObjectLoader = lazyModule.getMapsSavedObjectLoader;
    getQueryableUniqueIndexPatternIds = lazyModule.getQueryableUniqueIndexPatternIds;
    MapEmbeddable = lazyModule.MapEmbeddable;
    MapEmbeddableInput = lazyModule.MapEmbeddableInput;
    getIndexPatternService = lazyModule.getIndexPatternService;
    getHttp = lazyModule.getHttp;
    getMapsCapabilities = lazyModule.getMapsCapabilities;
    createMapStore = lazyModule.createMapStore;
    addLayerWithoutDataSync = lazyModule.addLayerWithoutDataSync;
    getInitialLayers = lazyModule.getInitialLayers;
    mergeInputWithSavedMap = lazyModule.mergeInputWithSavedMap;

    resolve(true);
  });
  return await whenModulesLoadedPromise;
}

export class MapEmbeddableFactory implements EmbeddableFactoryDefinition {
  type = MAP_SAVED_OBJECT_TYPE;
  savedObjectMetaData = {
    name: i18n.translate('xpack.maps.mapSavedObjectLabel', {
      defaultMessage: 'Map',
    }),
    type: MAP_SAVED_OBJECT_TYPE,
    getIconForSavedObject: () => APP_ICON,
  };

  async isEditable() {
    await waitForMapDependencies();
    return getMapsCapabilities().save as boolean;
  }

  // Not supported yet for maps types.
  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return i18n.translate('xpack.maps.embeddableDisplayName', {
      defaultMessage: 'map',
    });
  }

  async _getIndexPatterns(layerList: unknown[]): Promise<IIndexPattern[]> {
    // Need to extract layerList from store to get queryable index pattern ids
    const store = createMapStore();
    let queryableIndexPatternIds;
    try {
      layerList.forEach((layerDescriptor: unknown) => {
        store.dispatch(addLayerWithoutDataSync(layerDescriptor));
      });
      queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.mapEmbeddableFactory.invalidLayerList', {
          defaultMessage: 'Unable to load map, malformed layer list',
        })
      );
    }

    const promises = queryableIndexPatternIds.map(async indexPatternId => {
      try {
        return await getIndexPatternService().get(indexPatternId);
      } catch (error) {
        // Unable to load index pattern, better to not throw error so map embeddable can render
        // Error will be surfaced by map embeddable since it too will be unable to locate the index pattern
        return null;
      }
    });
    const indexPatterns = await Promise.all(promises);
    return _.compact(indexPatterns) as IIndexPattern[];
  }

  async _fetchSavedMap(savedObjectId: string) {
    const savedObjectLoader = getMapsSavedObjectLoader();
    return await savedObjectLoader.get(savedObjectId);
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: MapsEmbeddableInput,
    parent?: IContainer
  ) => {
    await waitForMapDependencies();
    const savedMap = await this._fetchSavedMap(savedObjectId);
    const layerList = getInitialLayers(savedMap.layerListJSON);
    const indexPatterns = await this._getIndexPatterns(layerList);

    let settings;
    if (savedMap.mapStateJSON) {
      const mapState = JSON.parse(savedMap.mapStateJSON);
      if (mapState.settings) {
        settings = mapState.settings;
      }
    }

    const embeddable = new MapEmbeddable(
      {
        layerList,
        title: savedMap.title,
        editUrl: getHttp().basePath.prepend(createMapPath(savedObjectId)),
        indexPatterns,
        editable: await this.isEditable(),
        settings,
      },
      input,
      parent
    );

    try {
      embeddable.updateInput(mergeInputWithSavedMap(input, savedMap));
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.mapEmbeddableFactory.invalidSavedObject', {
          defaultMessage: 'Unable to load map, malformed saved object',
        })
      );
    }

    return embeddable;
  };

  create = async (input: MapEmbeddableInput, parent?: IContainer) => {
    await waitForMapDependencies();
    const layerList = getInitialLayers();
    const indexPatterns = await this._getIndexPatterns(layerList);

    return new MapEmbeddable(
      {
        layerList,
        title: input.title ?? '',
        indexPatterns,
        editable: false,
      },
      input,
      parent
    );
  };
}
