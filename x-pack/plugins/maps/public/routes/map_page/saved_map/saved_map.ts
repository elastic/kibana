/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../../../../common/map_saved_object_type';
import { APP_ID, MAP_PATH, MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { createMapStore, MapStore, MapStoreState } from '../../../reducers/store';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
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
import { getMapAttributeService, SharingSavedObjectProps } from '../../../map_attribute_service';
import { OnSaveProps } from '../../../../../../../src/plugins/saved_objects/public';
import { MapByReferenceInput, MapEmbeddableInput } from '../../../embeddable/types';
import {
  getCoreChrome,
  getToasts,
  getIsAllowByValueEmbeddables,
  getSavedObjectsTagging,
  getTimeFilter,
} from '../../../kibana_services';
import { goToSpecifiedPath } from '../../../render_app';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { copyPersistentState } from '../../../reducers/copy_persistent_state';
import { getBreadcrumbs } from './get_breadcrumbs';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../../../reducers/ui';
import { createBasemapLayerDescriptor } from '../../../classes/layers/create_basemap_layer_descriptor';
import { whenLicenseInitialized } from '../../../licensed_features';
import { SerializedMapState, SerializedUiState } from './types';
import { setAutoOpenLayerWizardId } from '../../../actions/ui_actions';

function setMapSettingsFromEncodedState(settings: Partial<MapSettings>) {
  const decodedCustomIcons = settings.customIcons
    ? // base64 decode svg string
      settings.customIcons.map((icon) => {
        return { ...icon, svg: Buffer.from(icon.svg, 'base64').toString('utf-8') };
      })
    : [];
  return setMapSettings({
    ...settings,
    customIcons: decodedCustomIcons,
  });
}

export class SavedMap {
  private _attributes: MapSavedObjectAttributes | null = null;
  private _sharingSavedObjectProps: SharingSavedObjectProps | null = null;
  private readonly _defaultLayers: LayerDescriptor[];
  private readonly _embeddableId?: string;
  private _initialLayerListConfig: LayerDescriptor[] = [];
  private _mapEmbeddableInput?: MapEmbeddableInput;
  private readonly _onSaveCallback?: () => void;
  private _originatingApp?: string;
  private _originatingPath?: string;
  private readonly _stateTransfer?: EmbeddableStateTransfer;
  private readonly _store: MapStore;
  private _tags: string[] = [];
  private _defaultLayerWizard: string;

  constructor({
    defaultLayers = [],
    mapEmbeddableInput,
    embeddableId,
    onSaveCallback,
    originatingApp,
    stateTransfer,
    originatingPath,
    defaultLayerWizard,
  }: {
    defaultLayers?: LayerDescriptor[];
    mapEmbeddableInput?: MapEmbeddableInput;
    embeddableId?: string;
    onSaveCallback?: () => void;
    originatingApp?: string;
    stateTransfer?: EmbeddableStateTransfer;
    originatingPath?: string;
    defaultLayerWizard?: string;
  }) {
    this._defaultLayers = defaultLayers;
    this._mapEmbeddableInput = mapEmbeddableInput;
    this._embeddableId = embeddableId;
    this._onSaveCallback = onSaveCallback;
    this._originatingApp = originatingApp;
    this._originatingPath = originatingPath;
    this._stateTransfer = stateTransfer;
    this._store = createMapStore();
    this._defaultLayerWizard = defaultLayerWizard || '';
  }

  public getStore() {
    return this._store;
  }

  async whenReady() {
    await whenLicenseInitialized();

    if (!this._mapEmbeddableInput) {
      this._attributes = {
        title: '',
        description: '',
      };
    } else {
      const { attributes: doc, metaInfo } = await getMapAttributeService().unwrapAttributes(
        this._mapEmbeddableInput
      );
      const { references, ...savedObjectAttributes } = doc;
      this._attributes = savedObjectAttributes;
      if (metaInfo?.sharingSavedObjectProps) {
        this._sharingSavedObjectProps = metaInfo.sharingSavedObjectProps;
      }
      const savedObjectsTagging = getSavedObjectsTagging();
      if (savedObjectsTagging && references && references.length) {
        this._tags = savedObjectsTagging.ui.getTagIdsFromReferences(references);
      }
    }

    if (this._mapEmbeddableInput && this._mapEmbeddableInput.mapSettings !== undefined) {
      this._store.dispatch(setMapSettingsFromEncodedState(this._mapEmbeddableInput.mapSettings));
    } else if (this._attributes?.mapStateJSON) {
      try {
        const mapState = JSON.parse(this._attributes.mapStateJSON) as SerializedMapState;
        if (mapState.settings) {
          this._store.dispatch(setMapSettingsFromEncodedState(mapState.settings));
        }
      } catch (e) {
        // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
      }
    }

    let isLayerTOCOpen = DEFAULT_IS_LAYER_TOC_OPEN;
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.isLayerTOCOpen !== undefined) {
      isLayerTOCOpen = this._mapEmbeddableInput.isLayerTOCOpen;
    } else if (this._attributes?.uiStateJSON) {
      try {
        const uiState = JSON.parse(this._attributes.uiStateJSON) as SerializedUiState;
        if ('isLayerTOCOpen' in uiState) {
          isLayerTOCOpen = uiState.isLayerTOCOpen;
        }
      } catch (e) {
        // ignore malformed uiStateJSON, not a critical error for viewing map - map will just use defaults
      }
    }
    this._store.dispatch(setIsLayerTOCOpen(isLayerTOCOpen));

    let openTOCDetails: string[] = [];
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.openTOCDetails !== undefined) {
      openTOCDetails = this._mapEmbeddableInput.openTOCDetails;
    } else if (this._attributes?.uiStateJSON) {
      try {
        const uiState = JSON.parse(this._attributes.uiStateJSON) as SerializedUiState;
        if ('openTOCDetails' in uiState) {
          openTOCDetails = uiState.openTOCDetails;
        }
      } catch (e) {
        // ignore malformed uiStateJSON, not a critical error for viewing map - map will just use defaults
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
      try {
        const mapState = JSON.parse(this._attributes.mapStateJSON) as SerializedMapState;
        this._store.dispatch(
          setGotoWithCenter({
            lat: mapState.center.lat,
            lon: mapState.center.lon,
            zoom: mapState.zoom,
          })
        );
      } catch (e) {
        // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
      }
    }

    let layerList: LayerDescriptor[] = [];
    if (this._attributes.layerListJSON) {
      try {
        layerList = JSON.parse(this._attributes.layerListJSON) as LayerDescriptor[];
      } catch (e) {
        throw new Error('Malformed saved object: unable to parse layerListJSON');
      }
    } else {
      const basemapLayerDescriptor = createBasemapLayerDescriptor();
      if (basemapLayerDescriptor) {
        layerList.push(basemapLayerDescriptor);
      }
      if (this._defaultLayers.length) {
        layerList.push(...this._defaultLayers);
      }
    }
    this._store.dispatch<any>(replaceLayerList(layerList));
    if (this._mapEmbeddableInput && this._mapEmbeddableInput.hiddenLayers !== undefined) {
      this._store.dispatch<any>(setHiddenLayers(this._mapEmbeddableInput.hiddenLayers));
    }
    this._initialLayerListConfig = copyPersistentState(layerList);

    if (this._defaultLayerWizard) {
      this._store.dispatch<any>(setAutoOpenLayerWizardId(this._defaultLayerWizard));
    }
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

  public getOriginatingAppName(): string | undefined {
    return this._originatingApp ? this.getAppNameFromId(this._originatingApp) : undefined;
  }

  public getAppNameFromId = (appId: string): string | undefined => {
    return this._getStateTransfer().getAppNameFromId(appId);
  };

  public getTags(): string[] {
    return this._tags;
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

  public getSharingSavedObjectProps(): SharingSavedObjectProps | null {
    return this._sharingSavedObjectProps;
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
    dashboardId,
  }: OnSaveProps & {
    returnToOrigin?: boolean;
    newTags?: string[];
    saveByReference: boolean;
    dashboardId?: string | null;
  }) {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await whenReady before calling save');
    }

    const prevTitle = this._attributes.title;
    const prevDescription = this._attributes.description;
    const prevTags = this._tags;
    this._attributes.title = newTitle;
    this._attributes.description = newDescription;
    if (newTags) {
      this._tags = newTags;
    }
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
      this._tags = prevTags;
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
      await this._getStateTransfer().navigateToWithEmbeddablePackage(this._originatingApp, {
        state: {
          embeddableId: newCopyOnSave ? undefined : this._embeddableId,
          type: MAP_SAVED_OBJECT_TYPE,
          input: updatedMapEmbeddableInput,
        },
        path: this._originatingPath,
      });
      return;
    } else if (dashboardId) {
      await this._getStateTransfer().navigateToWithEmbeddablePackage('dashboards', {
        state: {
          type: MAP_SAVED_OBJECT_TYPE,
          input: updatedMapEmbeddableInput,
        },
        path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
      });
      return;
    }

    this._mapEmbeddableInput = updatedMapEmbeddableInput;
    // break connection to originating application
    this._originatingApp = undefined;

    // remove editor state so the connection is still broken after reload
    this._getStateTransfer().clearEditorState(APP_ID);

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

    const mapSettings = getMapSettings(state);

    this._attributes!.mapStateJSON = JSON.stringify({
      zoom: getMapZoom(state),
      center: getMapCenter(state),
      timeFilters: getTimeFilters(state),
      refreshConfig: {
        isPaused: getTimeFilter().getRefreshInterval().pause,
        interval: getTimeFilter().getRefreshInterval().value,
      },
      query: getQuery(state),
      filters: getFilters(state),
      settings: {
        ...mapSettings,
        // base64 encode custom icons to avoid svg strings breaking saved object stringification/parsing.
        customIcons: mapSettings.customIcons.map((icon) => {
          return { ...icon, svg: Buffer.from(icon.svg).toString('base64') };
        }),
      },
    } as SerializedMapState);

    this._attributes!.uiStateJSON = JSON.stringify({
      isLayerTOCOpen: getIsLayerTOCOpen(state),
      openTOCDetails: getOpenTOCDetails(state),
    } as SerializedUiState);
  }
}
