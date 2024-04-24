/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerReactEmbeddableFactory, registerReactEmbeddableSavedObject } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { MapAttributes } from '@kbn/maps-plugin/common/content_management';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';
import { savedObjectToEmbeddableAttributes } from '../map_attribute_service';
import { MapSerializeState } from './types';

export function setupMapEmbeddable() {
  registerReactEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, async () => {
    const { mapEmbeddableFactory } = await import('./map_react_embeddable');
    return mapEmbeddableFactory;
  });

  registerReactEmbeddableSavedObject<MapAttributes>({
    onAdd: (container, savedObject) => {
      container.addNewPanel({
        panelType: MAP_SAVED_OBJECT_TYPE,
        initialState: getInitialState(savedObject),
      });
    },
    embeddableType: MAP_SAVED_OBJECT_TYPE,
    savedObjectType: MAP_SAVED_OBJECT_TYPE,
    savedObjectName: i18n.translate('xpack.maps.mapSavedObjectLabel', {
      defaultMessage: 'Map',
    }),
    getIconForSavedObject: () => APP_ICON,
  });
}

export function getInitialState(savedObject: SavedObjectCommon<MapAttributes>): MapSerializeState {
  if (!savedObject.managed) {
    return { savedObjectId: savedObject.id };
  }

  return {
    attributes: savedObjectToEmbeddableAttributes(savedObject),
  };
}