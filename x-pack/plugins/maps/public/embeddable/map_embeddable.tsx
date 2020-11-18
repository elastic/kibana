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
import {
  Embeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
} from '../../../../../src/plugins/embeddable/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../src/plugins/data/public';
import {
  APPLY_FILTER_TRIGGER,
  VALUE_CLICK_TRIGGER,
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
import {
  replaceLayerList,
  setQuery,
  setRefreshConfig,
  disableScrollZoom,
  disableInteractive,
  disableTooltipControl,
  hideToolbarOverlay,
  hideLayerControl,
  hideViewControl,
  setReadOnly,
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
import { MapContainer } from '../connected_components/map_container';
import { SavedMap } from '../routes/map_page';
import { getIndexPatternsFromIds } from '../index_pattern_util';
import { getMapAttributeService } from '../map_attribute_service';
import type { OnSingleValueTriggerParams } from '../connected_components/types';
import { isUrlDrilldown, toUrlDrilldownDatatable } from '../trigger_actions/trigger_utils';

import {
  MapByValueInput,
  MapByReferenceInput,
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableOutput,
} from './types';
export { MapEmbeddableInput };

export class MapEmbeddable
  extends Embeddable<MapEmbeddableInput, MapEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<MapByValueInput, MapByReferenceInput> {
  type = MAP_SAVED_OBJECT_TYPE;

  private _savedMap: SavedMap;
  private _renderTooltipContent?: RenderToolTipContent;
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
        indexPatterns: [],
      },
      parent
    );

    this._savedMap = new SavedMap({ mapEmbeddableInput: initialInput });
    this._initializeSaveMap();
    this._subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));
  }

  private async _initializeSaveMap() {
    try {
      await this._savedMap.whenReady();
    } catch (e) {
      this.onFatalError(e);
      return;
    }
    this._initializeStore();
    this._initializeOutput();
    this._isInitialized = true;
    if (this._domNode) {
      this.render(this._domNode);
    }
  }

  private async _initializeStore() {
    const store = this._savedMap.getStore();
    store.dispatch(setReadOnly(true));
    store.dispatch(disableScrollZoom());

    if (_.has(this.input, 'disableInteractive') && this.input.disableInteractive) {
      store.dispatch(disableInteractive());
    }

    if (_.has(this.input, 'disableTooltipControl') && this.input.disableTooltipControl) {
      store.dispatch(disableTooltipControl());
    }
    if (_.has(this.input, 'hideToolbarOverlay') && this.input.hideToolbarOverlay) {
      store.dispatch(hideToolbarOverlay());
    }

    if (_.has(this.input, 'hideLayerControl') && this.input.hideLayerControl) {
      store.dispatch(hideLayerControl());
    }

    if (_.has(this.input, 'hideViewControl') && this.input.hideViewControl) {
      store.dispatch(hideViewControl());
    }

    this._dispatchSetQuery({
      query: this.input.query,
      timeRange: this.input.timeRange,
      filters: this.input.filters,
      forceRefresh: false,
    });
    if (this.input.refreshConfig) {
      this._dispatchSetRefreshConfig(this.input.refreshConfig);
    }

    this._unsubscribeFromStore = this._savedMap.getStore().subscribe(() => {
      this._handleStoreChanges();
    });
  }

  private async _initializeOutput() {
    const savedMapTitle = this._savedMap.getAttributes()?.title
      ? this._savedMap.getAttributes().title
      : '';
    const input = this.getInput();
    const title = input.hidePanelTitles ? '' : input.title || savedMapTitle;
    const savedObjectId = (input as MapByReferenceInput).savedObjectId;
    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: savedMapTitle,
      title,
      editPath: `/${MAP_PATH}/${savedObjectId}`,
      editUrl: getHttp().basePath.prepend(getExistingMapPath(savedObjectId)),
      indexPatterns: await this._getIndexPatterns(),
    });
  }

  public inputIsRefType(
    input: MapByValueInput | MapByReferenceInput
  ): input is MapByReferenceInput {
    return getMapAttributeService().inputIsRefType(input);
  }

  public async getInputAsRefType(): Promise<MapByReferenceInput> {
    const input = getMapAttributeService().getExplicitInputFromEmbeddable(this);
    return getMapAttributeService().getInputAsRefType(input, {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  }

  public async getInputAsValueType(): Promise<MapByValueInput> {
    const input = getMapAttributeService().getExplicitInputFromEmbeddable(this);
    return getMapAttributeService().getInputAsValueType(input);
  }

  public getDescription() {
    return this._isInitialized ? this._savedMap.getAttributes().description : '';
  }

  public supportedTriggers(): Array<keyof TriggerContextMapping> {
    return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
  }

  setRenderTooltipContent = (renderTooltipContent: RenderToolTipContent) => {
    this._renderTooltipContent = renderTooltipContent;
  };

  setEventHandlers = (eventHandlers: EventHandlers) => {
    this._savedMap.getStore().dispatch(setEventHandlers(eventHandlers));
  };

  getInspectorAdapters() {
    return getInspectorAdapters(this._savedMap.getStore().getState());
  }

  onContainerStateChanged(containerState: MapEmbeddableInput) {
    if (
      !_.isEqual(containerState.timeRange, this._prevTimeRange) ||
      !_.isEqual(containerState.query, this._prevQuery) ||
      !esFilters.onlyDisabledFiltersChanged(containerState.filters, this._prevFilters)
    ) {
      this._dispatchSetQuery({
        query: containerState.query,
        timeRange: containerState.timeRange,
        filters: containerState.filters,
        forceRefresh: false,
      });
    }

    if (
      containerState.refreshConfig &&
      !_.isEqual(containerState.refreshConfig, this._prevRefreshConfig)
    ) {
      this._dispatchSetRefreshConfig(containerState.refreshConfig);
    }
  }

  _dispatchSetQuery({
    query,
    timeRange,
    filters = [],
    forceRefresh,
  }: {
    query?: Query;
    timeRange?: TimeRange;
    filters?: Filter[];
    forceRefresh: boolean;
  }) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._savedMap.getStore().dispatch<any>(
      setQuery({
        filters: filters.filter((filter) => !filter.meta.disabled),
        query,
        timeFilters: timeRange,
        forceRefresh,
      })
    );
  }

  _dispatchSetRefreshConfig(refreshConfig: RefreshInterval) {
    this._prevRefreshConfig = refreshConfig;
    this._savedMap.getStore().dispatch(
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

    const I18nContext = getCoreI18n().Context;

    render(
      <Provider store={this._savedMap.getStore()}>
        <I18nContext>
          <MapContainer
            onSingleValueTrigger={this.onSingleValueTrigger}
            addFilters={this.input.hideFilterActions ? null : this.addFilters}
            getFilterActions={this.getFilterActions}
            getActionContext={this.getActionContext}
            renderTooltipContent={this._renderTooltipContent}
            title={this.getTitle()}
            description={this.getDescription()}
          />
        </I18nContext>
      </Provider>,
      this._domNode
    );
  }

  setLayerList(layerList: LayerDescriptor[]) {
    this._savedMap.getStore().dispatch<any>(replaceLayerList(layerList));
    this._getIndexPatterns().then((indexPatterns) => {
      this.updateOutput({
        ...this.getOutput(),
        indexPatterns,
      });
    });
  }

  private async _getIndexPatterns() {
    const queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(
      this._savedMap.getStore().getState()
    );
    return await getIndexPatternsFromIds(queryableIndexPatternIds);
  }

  onSingleValueTrigger = ({
    actionId,
    key,
    label,
    value,
    indexPattern,
  }: OnSingleValueTriggerParams) => {
    const action = getUiActions().getAction(actionId);
    if (!action) {
      throw new Error('Unable to apply action, could not locate action');
    }
    action.execute({
      ...this.getActionContext(),
      data: {
        data: toUrlDrilldownDatatable(key, value),
      },
    });
  };

  addFilters = async (filters: Filter[], actionId: string = ACTION_GLOBAL_APPLY_FILTER) => {
    const action = getUiActions().getAction(actionId);
    if (!action) {
      throw new Error('Unable to apply filter, could not locate action');
    }
    action.execute({
      ...this.getActionContext(),
      filters,
    });
  };

  getFilterActions = async () => {
    const filterActions = await getUiActions().getTriggerCompatibleActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      filters: [],
    });
    const valueClickActions = await getUiActions().getTriggerCompatibleActions(
      VALUE_CLICK_TRIGGER,
      {
        embeddable: this,
        data: {
          // uiActions.getTriggerCompatibleActions validates action againts context
          // so if event.key and event.value are used in the URL template but can not be parsed from context
          // then the action is filtered out.
          // To prevent filtering out actions, provide dummy context when initially fetching actions
          data: toUrlDrilldownDatatable('anyfield', 'anyvalue'),
        },
      }
    );
    return [...filterActions, ...valueClickActions.filter(isUrlDrilldown)];
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
    const center = getMapCenter(this._savedMap.getStore().getState());
    const zoom = getMapZoom(this._savedMap.getStore().getState());

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

    const isLayerTOCOpen = getIsLayerTOCOpen(this._savedMap.getStore().getState());
    if (this.input.isLayerTOCOpen !== isLayerTOCOpen) {
      this.updateInput({
        isLayerTOCOpen,
      });
    }

    const openTOCDetails = getOpenTOCDetails(this._savedMap.getStore().getState());
    if (!_.isEqual(this.input.openTOCDetails, openTOCDetails)) {
      this.updateInput({
        openTOCDetails,
      });
    }

    const hiddenLayerIds = getHiddenLayerIds(this._savedMap.getStore().getState());

    if (!_.isEqual(this.input.hiddenLayers, hiddenLayerIds)) {
      this.updateInput({
        hiddenLayers: hiddenLayerIds,
      });
    }
  }
}
