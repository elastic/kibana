/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../../../../common/map_saved_object_type';
import { MAP_PATH, MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
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
  getLayerListConfigOnly,
} from '../../../selectors/map_selectors';
import {
  setGotoWithCenter,
  setMapSettings,
  replaceLayerList,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
  setHiddenLayers,
} from '../../../actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../../../selectors/ui_selectors';
import { getMapAttributeService } from '../../../map_attribute_service';
import { OnSaveProps } from '../../../../../../../src/plugins/saved_objects/public';
import { MapByReferenceInput, MapEmbeddableInput } from '../../../embeddable/types';
import {
  getCoreChrome,
  getToasts,
  getIsAllowByValueEmbeddables,
  getSavedObjectsTagging,
} from '../../../kibana_services';
import { goToSpecifiedPath } from '../../../render_app';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { getInitialLayers } from './get_initial_layers';
import { copyPersistentState } from '../../../reducers/util';
import { getBreadcrumbs } from './get_breadcrumbs';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../../../reducers/ui';

export class SavedMap {
  private _attributes: MapSavedObjectAttributes | null = null;
  private readonly _defaultLayers: LayerDescriptor[];
  private readonly _embeddableId?: string;
  private _initialLayerListConfig: LayerDescriptor[] = [];
  private _mapEmbeddableInput?: MapEmbeddableInput;
  private readonly _onSaveCallback?: () => void;
  private _originatingApp?: string;
  private readonly _stateTransfer?: EmbeddableStateTransfer;
  private readonly _store: MapStore;

  constructor({
    defaultLayers = [],
    mapEmbeddableInput,
    embeddableId,
    onSaveCallback,
    originatingApp,
    stateTransfer,
  }: {
    defaultLayers?: LayerDescriptor[];
    mapEmbeddableInput?: MapEmbeddableInput;
    embeddableId?: string;
    onSaveCallback?: () => void;
    originatingApp?: string;
    stateTransfer?: EmbeddableStateTransfer;
  }) {
    this._defaultLayers = defaultLayers;
    this._mapEmbeddableInput = mapEmbeddableInput;
    this._embeddableId = embeddableId;
    this._onSaveCallback = onSaveCallback;
    this._originatingApp = originatingApp;
    this._stateTransfer = stateTransfer;
    this._store = createMapStore();
  }

  public getStore() {
    return this._store;
  }

  async whenReady() {
    if (!this._mapEmbeddableInput) {
      this._attributes = {
        title: '',
        description: '',
      };
    } else {
      this._attributes = await getMapAttributeService().unwrapAttributes(this._mapEmbeddableInput);
    }

    if (this._attributes?.mapStateJSON) {
      const mapState = JSON.parse(this._attributes.mapStateJSON);
      if (mapState.settings) {
        this._store.dispatch(setMapSettings(mapState.settings));
      }
    }

    let isLayerTOCOpen = DEFAULT_IS_LAYER_TOC_OPEN;
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.isLayerTOCOpen !== undefined) {
      isLayerTOCOpen = this._mapEmbeddableInput.isLayerTOCOpen;
    } else if (this._attributes?.uiStateJSON) {
      const uiState = JSON.parse(this._attributes.uiStateJSON);
      if ('isLayerTOCOpen' in uiState) {
        isLayerTOCOpen = uiState.isLayerTOCOpen;
      }
    }
    this._store.dispatch(setIsLayerTOCOpen(isLayerTOCOpen));

    let openTOCDetails = [];
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.openTOCDetails !== undefined) {
      openTOCDetails = this._mapEmbeddableInput.openTOCDetails;
    } else if (this._attributes?.uiStateJSON) {
      const uiState = JSON.parse(this._attributes.uiStateJSON);
      if ('openTOCDetails' in uiState) {
        openTOCDetails = uiState.openTOCDetails;
      }
    }
    this._store.dispatch(setOpenTOCDetails(openTOCDetails));

    if (this._mapEmbeddableInput && this._mapEmbeddableInput.mapCenter !== undefined) {
      this._store.dispatch(
        setGotoWithCenter({
          lat: this._mapEmbeddableInput.mapCenter.lat,
          lon: this._mapEmbeddableInput.mapCenter.lon,
          zoom: this._mapEmbeddableInput.mapCenter.zoom,
        })
      );
    } else if (this._attributes?.mapStateJSON) {
      const mapState = JSON.parse(this._attributes.mapStateJSON);
      this._store.dispatch(
        setGotoWithCenter({
          lat: mapState.center.lat,
          lon: mapState.center.lon,
          zoom: mapState.zoom,
        })
      );
    }

    const layerList = getInitialLayers(this._attributes.layerListJSON, this._defaultLayers);
    this._store.dispatch<any>(replaceLayerList(layerList));
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.hiddenLayers !== undefined) {
      this._store.dispatch<any>(setHiddenLayers(this._mapEmbeddableInput.hiddenLayers));
    }
    this._initialLayerListConfig = copyPersistentState(layerList);
  }

  hasUnsavedChanges = () => {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await whenReady before calling hasUnsavedChanges');
    }

    const savedLayerList = this._attributes.layerListJSON
      ? JSON.parse(this._attributes.layerListJSON)
      : null;
    const layerListConfigOnly = getLayerListConfigOnly(this._store.getState());
    return !savedLayerList
      ? !_.isEqual(layerListConfigOnly, this._initialLayerListConfig)
      : // savedMap stores layerList as a JSON string using JSON.stringify.
        // JSON.stringify removes undefined properties from objects.
        // savedMap.getLayerList converts the JSON string back into Javascript array of objects.
        // Need to perform the same process for layerListConfigOnly to compare apples to apples
        // and avoid undefined properties in layerListConfigOnly triggering unsaved changes.
        !_.isEqual(JSON.parse(JSON.stringify(layerListConfigOnly)), savedLayerList);
  };

  private _getStateTransfer() {
    if (!this._stateTransfer) {
      throw new Error('stateTransfer not provided in constructor');
    }

    return this._stateTransfer;
  }

  private _getPageTitle(): string {
    if (!this._mapEmbeddableInput) {
      return i18n.translate('xpack.maps.breadcrumbsCreate', {
        defaultMessage: 'Create',
      });
    }

    return this.isByValue()
      ? i18n.translate('xpack.maps.breadcrumbsEditByValue', {
          defaultMessage: 'Edit map',
        })
      : this._attributes!.title;
  }

  setBreadcrumbs() {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await whenReady before calling hasUnsavedChanges');
    }

    const breadcrumbs = getBreadcrumbs({
      pageTitle: this._getPageTitle(),
      isByValue: this.isByValue(),
      getHasUnsavedChanges: this.hasUnsavedChanges,
      originatingApp: this._originatingApp,
      getAppNameFromId: this._getStateTransfer().getAppNameFromId,
    });
    getCoreChrome().setBreadcrumbs(breadcrumbs);
  }

  public getSavedObjectId(): string | undefined {
    return this._mapEmbeddableInput && 'savedObjectId' in this._mapEmbeddableInput
      ? (this._mapEmbeddableInput as MapByReferenceInput).savedObjectId
      : undefined;
  }

  public getOriginatingApp(): string | undefined {
    return this._originatingApp;
  }

  public getAppNameFromId = (appId: string): string | undefined => {
    return this._getStateTransfer().getAppNameFromId(appId);
  };

  public getTags(): string[] {
    // TODO call something like savedObjectsTagging.ui.getTagIdsFromReferences(state.persistedDoc.references)
    return [];
  }

  public hasSaveAndReturnConfig() {
    const hasOriginatingApp = !!this._originatingApp;
    const isNewMap = !this.getSavedObjectId();
    return getIsAllowByValueEmbeddables() ? hasOriginatingApp : !isNewMap && hasOriginatingApp;
  }

  public getTitle(): string {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await getTitle before calling getAttributes');
    }
    return this._attributes.title !== undefined ? this._attributes.title : '';
  }

  public getAttributes(): MapSavedObjectAttributes {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await whenReady before calling getAttributes');
    }

    return this._attributes;
  }

  public isByValue(): boolean {
    const hasSavedObjectId = !!this.getSavedObjectId();
    return getIsAllowByValueEmbeddables() && !!this._originatingApp && !hasSavedObjectId;
  }

  public async save({
    newDescription,
    newTitle,
    newCopyOnSave,
    returnToOrigin,
    newTags,
    saveByReference,
  }: OnSaveProps & {
    returnToOrigin: boolean;
    newTags?: string[];
    saveByReference: boolean;
  }) {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await whenReady before calling save');
    }

    const prevTitle = this._attributes.title;
    const prevDescription = this._attributes.description;
    this._attributes.title = newTitle;
    this._attributes.description = newDescription;
    this._syncAttributesWithStore();

    let updatedMapEmbeddableInput: MapEmbeddableInput;
    try {
      const savedObjectsTagging = getSavedObjectsTagging();
      // Attribute service deviates from Saved Object client by including references as a child to attributes in stead of a sibling
      const attributes =
        savedObjectsTagging && newTags
          ? {
              ...this._attributes,
              references: savedObjectsTagging.ui.updateTagsReferences([], newTags),
            }
          : this._attributes;
      updatedMapEmbeddableInput = (await getMapAttributeService().wrapAttributes(
        attributes,
        saveByReference,
        newCopyOnSave ? undefined : this._mapEmbeddableInput
      )) as MapEmbeddableInput;
    } catch (e) {
      // Error toast displayed by wrapAttributes
      this._attributes.title = prevTitle;
      this._attributes.description = prevDescription;
      return;
    }

    if (returnToOrigin) {
      if (!this._originatingApp) {
        getToasts().addDanger({
          title: i18n.translate('xpack.maps.topNav.saveErrorTitle', {
            defaultMessage: `Error saving '{title}'`,
            values: { title: newTitle },
          }),
          text: i18n.translate('xpack.maps.topNav.saveErrorText', {
            defaultMessage: 'Unable to return to app without an originating app',
          }),
        });
        return;
      }
      this._getStateTransfer().navigateToWithEmbeddablePackage(this._originatingApp, {
        state: {
          embeddableId: newCopyOnSave ? undefined : this._embeddableId,
          type: MAP_SAVED_OBJECT_TYPE,
          input: updatedMapEmbeddableInput,
        },
      });
      return;
    }

    this._mapEmbeddableInput = updatedMapEmbeddableInput;
    // break connection to originating application
    this._originatingApp = undefined;
    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.topNav.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: newTitle },
      }),
    });

    getCoreChrome().docTitle.change(newTitle);
    this.setBreadcrumbs();
    goToSpecifiedPath(`/${MAP_PATH}/${this.getSavedObjectId()}${window.location.hash}`);

    if (this._onSaveCallback) {
      this._onSaveCallback();
    }

    return;
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
