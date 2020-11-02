/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../../../../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { getMapEmbeddableTitle } from '../../../../common/i18n_getters';
import { createMapStore, MapStore, MapStoreState } from '../../../reducers/store';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
  getRefreshConfig,
  getQuery,
  getFilters,
  getMapSettings,
} from '../../../selectors/map_selectors';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../../../selectors/ui_selectors';
import { copyPersistentState } from '../../../reducers/util';
import { getMapAttributeService } from '../../../map_attribute_service';
import {
  checkForDuplicateTitle,
  OnSaveProps,
} from '../../../../../../../src/plugins/saved_objects/public';
import { MapByReferenceInput, MapEmbeddableInput } from '../../../embeddable/types';
import {
  getCoreChrome,
  getCoreOverlays,
  getSavedObjectsClient,
  getToasts,
} from '../../../kibana_services';
import { goToSpecifiedPath } from '../../render_app';

export class SavedMap {
  private _attributes: MapSavedObjectAttributes | null = null;
  private readonly _embeddableId?: string;
  private readonly _mapEmbeddableInput?: MapEmbeddableInput;
  private _originatingApp?: string;
  private readonly _store: MapStore;

  constructor(mapEmbeddableInput?: MapEmbeddableInput, embeddableId?: string) {
    this._mapEmbeddableInput = mapEmbeddableInput;
    this._embeddableId = embeddableId;
    this._store = createMapStore();
  }

  public getStore() {
    return this._store;
  }

  async loadAttributes() {
    if (!this._mapEmbeddableInput) {
      this._attributes = {
        title: i18n.translate('xpack.maps.newMapTitle', {
          defaultMessage: 'New Map',
        }),
      };
    } else {
      this._attributes = await getMapAttributeService().unwrapAttributes(this._mapEmbeddableInput);
    }
    return this._attributes;
  }

  public getSavedObjectId(): string | undefined {
    return this._mapEmbeddableInput?.savedObjectId;
  }

  public getAttributes(): MapSavedObjectAttributes {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await loadAttributes before calling getAttributes');
    }

    return this._attributes;
  }

  public async save({
    newDescription,
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
    returnToOrigin,
    saveByReference,
    originatingApp,
    stateTransfer,
    setBreadcrumbs,
  }: OnSaveProps & {
    returnToOrigin: boolean;
    saveByReference: boolean;
    originatingApp?: string;
    stateTransfer: EmbeddableStateTransfer;
    setBreadcrumbs: (title: string) => void;
  }) {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await loadAttributes before calling save');
    }

    if (saveByReference) {
      try {
        await checkForDuplicateTitle(
          {
            id: newCopyOnSave ? undefined : this.getSavedObjectId(),
            title: newTitle,
            copyOnSave: newCopyOnSave,
            lastSavedTitle: this._attributes.title,
            getEsType: () => MAP_SAVED_OBJECT_TYPE,
            getDisplayName: getMapEmbeddableTitle,
          },
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
          {
            savedObjectsClient: getSavedObjectsClient(),
            overlays: getCoreOverlays(),
          }
        );
      } catch (e) {
        // ignore duplicate title failure, user notified in save modal
        return;
      }
    }

    const prevTitle = this._attributes.title;
    const prevDescription = this._attributes.description;
    this._attributes.title = newTitle;
    this._attributes.description = newDescription;
    this._syncAttributesWithStore();

    let updatedMapEmbeddableInput: MapEmbeddableInput;
    try {
      updatedMapEmbeddableInput = await getMapAttributeService().wrapAttributes(
        this._attributes,
        saveByReference,
        newCopyOnSave ? undefined : this._mapEmbeddableInput
      );
    } catch (e) {
      // Error toast displayed by wrapAttributes
      this._attributes.title = prevTitle;
      this._attributes.description = prevDescription;
      return;
    }

    if (returnToOrigin) {
      if (!originatingApp) {
        getToasts().addDanger({
          title: i18n.translate('xpack.maps.topNav.saveErrorMessage', {
            defaultMessage: `Error saving '{title}'`,
            values: { title: newTitle },
          }),
          text: i18n.translate('xpack.maps.topNav.saveErrorMessage', {
            defaultMessage: 'Unable to return to app without an originating app',
          }),
        });
        return;
      }
      stateTransfer.navigateToWithEmbeddablePackage(originatingApp, {
        state: {
          embeddableId: newCopyOnSave ? undefined : this._embeddableId,
          type: MAP_SAVED_OBJECT_TYPE,
          updatedMapEmbeddableInput,
        },
      });
      return;
    }

    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.topNav.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: newTitle },
      }),
    });

    getCoreChrome().docTitle.change(newTitle);
    setBreadcrumbs(newTitle);
    goToSpecifiedPath(`/map/${updatedMapEmbeddableInput.savedObjectId}${window.location.hash}`);
    return { id: updatedMapEmbeddableInput.savedObjectId };
  }

  private _syncAttributesWithStore() {
    const state: MapStoreState = this._store.getState();
    const layerList = getLayerListRaw(state);
    const layerListConfigOnly = copyPersistentState(layerList);
    this._attributes!.layerListJSON = JSON.stringify(layerListConfigOnly);

    this._attributes!.mapStateJSON = JSON.stringify({
      zoom: getMapZoom(state),
      center: getMapCenter(state),
      timeFilters: getTimeFilters(state),
      refreshConfig: getRefreshConfig(state),
      query: _.omit(getQuery(state), 'queryLastTriggeredAt'),
      filters: getFilters(state),
      settings: getMapSettings(state),
    });

    this._attributes!.uiStateJSON = JSON.stringify({
      isLayerTOCOpen: getIsLayerTOCOpen(state),
      openTOCDetails: getOpenTOCDetails(state),
    });
  }
}
