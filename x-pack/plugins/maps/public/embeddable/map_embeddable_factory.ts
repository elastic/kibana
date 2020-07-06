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
import { getExistingMapPath, MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';
import { LayerDescriptor } from '../../common/descriptor_types';
import { MapEmbeddableInput } from './types';
import { lazyLoadMapModules } from '../lazy_load_bundle';

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
    const { getMapsCapabilities } = await lazyLoadMapModules();
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

  async _getIndexPatterns(layerList: LayerDescriptor[]): Promise<IIndexPattern[]> {
    // Need to extract layerList from store to get queryable index pattern ids
    const {
      addLayerWithoutDataSync,
      createMapStore,
      getIndexPatternService,
      getQueryableUniqueIndexPatternIds,
    } = await lazyLoadMapModules();
    const store = createMapStore();
    let queryableIndexPatternIds: string[];
    try {
      layerList.forEach((layerDescriptor: LayerDescriptor) => {
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

    const promises = queryableIndexPatternIds.map(async (indexPatternId) => {
      try {
        // @ts-ignore
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
    const { getMapsSavedObjectLoader } = await lazyLoadMapModules();
    const savedObjectLoader = getMapsSavedObjectLoader();
    return await savedObjectLoader.get(savedObjectId);
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: MapEmbeddableInput,
    parent?: IContainer
  ) => {
    const {
      getInitialLayers,
      getHttp,
      MapEmbeddable,
      mergeInputWithSavedMap,
    } = await lazyLoadMapModules();
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
        editUrl: getHttp().basePath.prepend(getExistingMapPath(savedObjectId)),
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
    const { getInitialLayers, MapEmbeddable } = await lazyLoadMapModules();
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
