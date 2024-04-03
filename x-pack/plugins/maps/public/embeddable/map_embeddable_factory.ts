/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE, APP_ICON, MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { extract, inject } from '../../common/embeddable';
import { MapByReferenceInput, MapEmbeddableInput } from './types';
import { getApplication, getMapsCapabilities, getUsageCollection } from '../kibana_services';

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
    return getMapsCapabilities().save as boolean;
  }

  // Not supported yet for maps types.
  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return MAP_EMBEDDABLE_NAME;
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: MapEmbeddableInput,
    parent?: IContainer
  ) => {
    if (!(input as MapByReferenceInput).savedObjectId) {
      (input as MapByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  };

  create = async (input: MapEmbeddableInput, parent?: IContainer) => {
    const { MapEmbeddable } = await import('./map_embeddable');
    const usageCollection = getUsageCollection();
    if (usageCollection) {
      // currentAppId$ is a BehaviorSubject exposed as an observable so subscription gets last value upon subscribe
      getApplication()
        .currentAppId$.pipe(first())
        .subscribe((appId) => {
          if (appId) usageCollection.reportUiCounter('map', 'loaded', `open_maps_vis_${appId}`);
        });
    }
    return new MapEmbeddable(
      {
        editable: await this.isEditable(),
      },
      input,
      parent
    );
  };

  inject = inject;

  extract = extract;
}
