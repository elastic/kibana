/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE, APP_ICON, MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { LATEST_VERSION } from '../../common/content_management';
import type { MapAttributes as MapAttributesV1 } from '../../common/content_management/v1';
import { extract, inject } from '../../common/embeddable';
import { MapByReferenceInput, MapEmbeddableInput } from './types';
import { getApplication, getMapsCapabilities, getUsageCollection } from '../kibana_services';
import { MapByValueInput } from '.';

export class MapEmbeddableFactory implements EmbeddableFactoryDefinition {
  type = MAP_SAVED_OBJECT_TYPE;
  latestVersion = LATEST_VERSION.toString();

  migrations = {
    // TODO make a common function for client-side and the server-side saved object migrations
    '2.0.0': (state: Omit<MapByValueInput, 'attributes'> & { attributes: MapAttributesV1 }) => {
      const { mapStateJSON, layerListJSON, uiStateJSON, ...rest } = state.attributes;
      return {
        ...state,
        attributes: {
          ...rest,
          mapState: mapStateJSON ? JSON.parse(mapStateJSON) : undefined,
          layerList: layerListJSON ? JSON.parse(layerListJSON) : undefined,
          uiState: uiStateJSON ? JSON.parse(uiStateJSON) : undefined,
        },
      };
    },
  };
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
