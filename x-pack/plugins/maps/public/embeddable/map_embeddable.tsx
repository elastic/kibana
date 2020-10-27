/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subscription } from 'rxjs';
import { Unsubscribe } from 'redux';
import { i18n } from '@kbn/i18n';
import {
  Embeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
} from '../../../../../src/plugins/embeddable/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../src/plugins/data/public';
import {
  APPLY_FILTER_TRIGGER,
  ActionExecutionContext,
  TriggerContextMapping,
} from '../../../../../src/plugins/ui_actions/public';
import {
  esFilters,
  TimeRange,
  Filter,
  Query,
  RefreshInterval,
} from '../../../../../src/plugins/data/public';
import { createMapStore, MapStore } from '../reducers/store';
import { MapSettings } from '../reducers/map';
import {
  addLayerWithoutDataSync,
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  setRefreshConfig,
  disableScrollZoom,
  disableInteractive,
  disableTooltipControl,
  hideToolbarOverlay,
  hideLayerControl,
  hideViewControl,
  setHiddenLayers,
  setMapSettings,
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getInspectorAdapters,
  setEventHandlers,
  EventHandlers,
} from '../reducers/non_serializable_instances';
import {
  getMapCenter,
  getMapZoom,
  getHiddenLayerIds,
  getQueryableUniqueIndexPatternIds,
} from '../selectors/map_selectors';
import {
  APP_ID,
  getExistingMapPath,
  MAP_SAVED_OBJECT_TYPE,
  MAP_PATH,
} from '../../common/constants';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import { getUiActions, getCoreI18n, getHttp } from '../kibana_services';
import { LayerDescriptor } from '../../common/descriptor_types';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { MapContainer } from '../connected_components/map_container';
import { getMapAttributeService } from '../map_attribute_service';
import { getInitialLayers } from '../routing/bootstrap/get_initial_layers';
import { getIndexPatternsFromIds } from '../index_pattern_util';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../reducers/ui';

import {
  MapByValueInput,
  MapByReferenceInput,
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableOutput,
} from './types';
export { MapEmbeddableInput };

const attributeService = getMapAttributeService();

export class MapEmbeddable
  extends Embeddable<MapEmbeddableInput, MapEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<MapByValueInput, MapByReferenceInput> {
  type = MAP_SAVED_OBJECT_TYPE;

  private _attributes: MapSavedObjectAttributes | null = null;
  private _renderTooltipContent?: RenderToolTipContent;
  private _store: MapStore;
  private _subscription: Subscription;
  private _prevTimeRange?: TimeRange;
  private _prevQuery?: Query;
  private _prevRefreshConfig?: RefreshInterval;
  private _prevFilters?: Filter[];
  private _domNode?: HTMLElement;
  private _unsubscribeFromStore?: Unsubscribe;
  private _isInitialized = false;

  constructor(config: MapEmbeddableConfig, initialInput: MapEmbeddableInput, parent?: IContainer) {
    super(
      initialInput,
      {
        editApp: APP_ID,
        editable: config.editable,
      },
      parent
    );

    this._store = createMapStore();
    this._unsubscribeFromStore = this._store.subscribe(() => {
      this._handleStoreChanges();
    });

    this.loadMapAttributes(initialInput);

    this._subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));
  }

  private async loadMapAttributes(input: MapEmbeddableInput) {
    this._attributes = await attributeService.unwrapAttributes(input);
    const layerList = getInitialLayers(this._attributes.layerListJSON);
    this.setLayerList(layerList);
    await this.initializeOutput();
    this._isInitialized = true;
    if (this._domNode) {
      this.render(this._domNode);
    }
  }

  private async initializeOutput() {
    const savedMapTitle = this._attributes?.title ? this._attributes.title : '';
    const input = this.getInput();
    const title = input.hidePanelTitles ? '' : input.title || savedMapTitle;
    const savedObjectId = (input as MapByReferenceInput).savedObjectId;
    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: savedMapTitle,
      title,
      editPath: `/${MAP_PATH}/${savedObjectId}`,
      editUrl: getHttp().basePath.prepend(getExistingMapPath(savedObjectId)),
    });
  }

  public inputIsRefType(
    input: MapByValueInput | MapByReferenceInput
  ): input is MapByReferenceInput {
    return attributeService.inputIsRefType(input);
  }

  public async getInputAsRefType(): Promise<MapByReferenceInput> {
    const input = attributeService.getExplicitInputFromEmbeddable(this);
    return attributeService.getInputAsRefType(input, {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  }

  public async getInputAsValueType(): Promise<MapByValueInput> {
    const input = attributeService.getExplicitInputFromEmbeddable(this);
    return attributeService.getInputAsValueType(input);
  }

  public getDescription() {
    return this._attributes?.description;
  }

  public supportedTriggers(): Array<keyof TriggerContextMapping> {
    return [APPLY_FILTER_TRIGGER];
  }

  setRenderTooltipContent = (renderTooltipContent: RenderToolTipContent) => {
    this._renderTooltipContent = renderTooltipContent;
  };

  setEventHandlers = (eventHandlers: EventHandlers) => {
    this._store.dispatch(setEventHandlers(eventHandlers));
  };

  getInspectorAdapters() {
    return getInspectorAdapters(this._store.getState());
  }

  onContainerStateChanged(containerState: MapEmbeddableInput) {
    if (
      !_.isEqual(containerState.timeRange, this._prevTimeRange) ||
      !_.isEqual(containerState.query, this._prevQuery) ||
      !esFilters.onlyDisabledFiltersChanged(containerState.filters, this._prevFilters)
    ) {
      this._dispatchSetQuery(containerState);
    }

    if (!_.isEqual(containerState.refreshConfig, this._prevRefreshConfig)) {
      this._dispatchSetRefreshConfig(containerState);
    }
  }

  _dispatchSetQuery({
    query,
    timeRange,
    filters,
    forceRefresh,
  }: {
    query?: Query;
    timeRange?: TimeRange;
    filters: Filter[];
    forceRefresh?: boolean;
  }) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._store.dispatch<any>(
      setQuery({
        filters: filters.filter((filter) => !filter.meta.disabled),
        query,
        timeFilters: timeRange,
        forceRefresh,
      })
    );
  }

  _dispatchSetRefreshConfig({ refreshConfig }: Pick<MapEmbeddableInput, 'refreshConfig'>) {
    this._prevRefreshConfig = refreshConfig;
    this._store.dispatch(
      setRefreshConfig({
        isPaused: refreshConfig.pause,
        interval: refreshConfig.value,
      })
    );
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement) {
    this._domNode = domNode;
    if (!this._isInitialized) {
      return;
    }

    this._store.dispatch(setReadOnly(true));
    this._store.dispatch(disableScrollZoom());

    if (this._attributes?.mapStateJSON) {
      const mapState = JSON.parse(this._attributes.mapStateJSON);
      if (mapState.settings) {
        this._store.dispatch(setMapSettings(mapState.settings));
      }
    }

    let isLayerTOCOpen = DEFAULT_IS_LAYER_TOC_OPEN;
    if (_.has(this.input, 'isLayerTOCOpen')) {
      isLayerTOCOpen = this.input.isLayerTOCOpen;
    } else if (this._attributes?.uiStateJSON) {
      const uiState = JSON.parse(this._attributes.uiStateJSON);
      if ('isLayerTOCOpen' in uiState) {
        isLayerTOCOpen = uiState.isLayerTOCOpen;
      }
    }
    this._store.dispatch(setIsLayerTOCOpen(isLayerTOCOpen));

    let openTOCDetails = [];
    if (_.has(this.input, 'openTOCDetails')) {
      openTOCDetails = this.input.openTOCDetails;
    } else if (this._attributes?.uiStateJSON) {
      const uiState = JSON.parse(this._attributes.uiStateJSON);
      if ('openTOCDetails' in uiState) {
        openTOCDetails = uiState.openTOCDetails;
      }
    }
    this._store.dispatch(setOpenTOCDetails(openTOCDetails));

    if (_.has(this.input, 'disableInteractive') && this.input.disableInteractive) {
      this._store.dispatch(disableInteractive());
    }

    if (_.has(this.input, 'disableTooltipControl') && this.input.disableTooltipControl) {
      this._store.dispatch(disableTooltipControl());
    }
    if (_.has(this.input, 'hideToolbarOverlay') && this.input.hideToolbarOverlay) {
      this._store.dispatch(hideToolbarOverlay());
    }

    if (_.has(this.input, 'hideLayerControl') && this.input.hideLayerControl) {
      this._store.dispatch(hideLayerControl());
    }

    if (_.has(this.input, 'hideViewControl') && this.input.hideViewControl) {
      this._store.dispatch(hideViewControl());
    }

    if (this.input.mapCenter) {
      this._store.dispatch(
        setGotoWithCenter({
          lat: this.input.mapCenter.lat,
          lon: this.input.mapCenter.lon,
          zoom: this.input.mapCenter.zoom,
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

    if (this.input.hiddenLayers) {
      this._store.dispatch<any>(setHiddenLayers(this.input.hiddenLayers));
    }
    this._dispatchSetQuery(this.input);
    this._dispatchSetRefreshConfig(this.input);

    const I18nContext = getCoreI18n().Context;

    render(
      <Provider store={this._store}>
        <I18nContext>
          <MapContainer
            addFilters={this.input.hideFilterActions ? null : this.addFilters}
            getFilterActions={this.getFilterActions}
            getActionContext={this.getActionContext}
            renderTooltipContent={this._renderTooltipContent}
            title={this.getTitle()}
            description={this._description}
          />
        </I18nContext>
      </Provider>,
      this._domNode
    );
  }

  setLayerList(layerList: LayerDescriptor[]) {
    this.setIndexPatterns(layerList);
    this._store.dispatch<any>(replaceLayerList(layerList));
  }

  private async setIndexPatterns(layerList: LayerDescriptor[]) {
    let queryableIndexPatternIds: string[];
    try {
      const tempStore = createMapStore();
      layerList.forEach((layerDescriptor: LayerDescriptor) => {
        tempStore.dispatch(addLayerWithoutDataSync(layerDescriptor));
      });
      queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(tempStore.getState());
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.mapEmbeddable.invalidLayerList', {
          defaultMessage: 'Unable to set map embeddable layer list, invalid layer list',
        })
      );
    }
    const indexPatterns = await getIndexPatternsFromIds(queryableIndexPatternIds);
    this.updateOutput({
      ...this.getOutput(),
      indexPatterns: [],
    });
  }

  addFilters = async (filters: Filter[], actionId: string = ACTION_GLOBAL_APPLY_FILTER) => {
    const executeContext = {
      ...this.getActionContext(),
      filters,
    };
    const action = getUiActions().getAction(actionId);
    if (!action) {
      throw new Error('Unable to apply filter, could not locate action');
    }
    action.execute(executeContext);
  };

  getFilterActions = async () => {
    return await getUiActions().getTriggerCompatibleActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      filters: [],
    });
  };

  getActionContext = () => {
    const trigger = getUiActions().getTrigger(APPLY_FILTER_TRIGGER);
    if (!trigger) {
      throw new Error('Unable to get context, could not locate trigger');
    }
    return {
      embeddable: this,
      trigger,
    } as ActionExecutionContext;
  };

  destroy() {
    super.destroy();
    if (this._unsubscribeFromStore) {
      this._unsubscribeFromStore();
    }

    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }

    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }

  reload() {
    this._dispatchSetQuery({
      query: this._prevQuery,
      timeRange: this._prevTimeRange,
      filters: this._prevFilters ?? [],
      forceRefresh: true,
    });
  }

  _handleStoreChanges() {
    const center = getMapCenter(this._store.getState());
    const zoom = getMapZoom(this._store.getState());

    const mapCenter = this.input.mapCenter || undefined;
    if (
      !mapCenter ||
      mapCenter.lat !== center.lat ||
      mapCenter.lon !== center.lon ||
      mapCenter.zoom !== zoom
    ) {
      this.updateInput({
        mapCenter: {
          lat: center.lat,
          lon: center.lon,
          zoom,
        },
      });
    }

    const isLayerTOCOpen = getIsLayerTOCOpen(this._store.getState());
    if (this.input.isLayerTOCOpen !== isLayerTOCOpen) {
      this.updateInput({
        isLayerTOCOpen,
      });
    }

    const openTOCDetails = getOpenTOCDetails(this._store.getState());
    if (!_.isEqual(this.input.openTOCDetails, openTOCDetails)) {
      this.updateInput({
        openTOCDetails,
      });
    }

    const hiddenLayerIds = getHiddenLayerIds(this._store.getState());

    if (!_.isEqual(this.input.hiddenLayers, hiddenLayerIds)) {
      this.updateInput({
        hiddenLayers: hiddenLayerIds,
      });
    }
  }
}
