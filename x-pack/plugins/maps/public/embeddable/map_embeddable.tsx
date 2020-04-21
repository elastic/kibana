/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Subscription } from 'rxjs';
import { Unsubscribe } from 'redux';
import {
  Embeddable,
  IContainer,
  EmbeddableInput,
  EmbeddableOutput,
} from '../../../../../src/plugins/embeddable/public';
import { APPLY_FILTER_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import {
  esFilters,
  IIndexPattern,
  TimeRange,
  Filter,
  Query,
  RefreshInterval,
} from '../../../../../src/plugins/data/public';
import { GisMap } from '../connected_components/gis_map';
import { createMapStore, MapStore } from '../reducers/store';
import {
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
} from '../actions/map_actions';
import { MapCenterAndZoom } from '../../common/descriptor_types';
import { setReadOnly, setIsLayerTOCOpen, setOpenTOCDetails } from '../actions/ui_actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getInspectorAdapters,
  setEventHandlers,
  EventHandlers,
} from '../reducers/non_serializable_instances';
import { getMapCenter, getMapZoom, getHiddenLayerIds } from '../selectors/map_selectors';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { RenderToolTipContent } from '../layers/tooltips/tooltip_property';
import { getUiActions, getCoreI18n } from '../kibana_services';

interface MapEmbeddableConfig {
  editUrl?: string;
  indexPatterns: IIndexPattern[];
  editable: boolean;
  title?: string;
  layerList: unknown[];
}

export interface MapEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
  filters: Filter[];
  query?: Query;
  refreshConfig: RefreshInterval;
  isLayerTOCOpen: boolean;
  openTOCDetails?: string[];
  disableTooltipControl?: boolean;
  disableInteractive?: boolean;
  hideToolbarOverlay?: boolean;
  hideLayerControl?: boolean;
  hideViewControl?: boolean;
  mapCenter?: MapCenterAndZoom;
  hiddenLayers?: string[];
  hideFilterActions?: boolean;
}

export interface MapEmbeddableOutput extends EmbeddableOutput {
  indexPatterns: IIndexPattern[];
}

export class MapEmbeddable extends Embeddable<MapEmbeddableInput, MapEmbeddableOutput> {
  type = MAP_SAVED_OBJECT_TYPE;

  private _renderTooltipContent?: RenderToolTipContent;
  private _eventHandlers?: EventHandlers;
  private _layerList: unknown[];
  private _store: MapStore;
  private _subscription: Subscription;
  private _prevTimeRange?: TimeRange;
  private _prevQuery?: Query;
  private _prevRefreshConfig?: RefreshInterval;
  private _prevFilters?: Filter[];
  private _domNode?: HTMLElement;
  private _unsubscribeFromStore?: Unsubscribe;

  constructor(
    config: MapEmbeddableConfig,
    initialInput: MapEmbeddableInput,
    parent?: IContainer,
    renderTooltipContent?: RenderToolTipContent,
    eventHandlers?: EventHandlers
  ) {
    super(
      initialInput,
      {
        editUrl: config.editUrl,
        indexPatterns: config.indexPatterns,
        editable: config.editable,
        defaultTitle: config.title,
      },
      parent
    );

    this._renderTooltipContent = renderTooltipContent;
    this._eventHandlers = eventHandlers;
    this._layerList = config.layerList;
    this._store = createMapStore();

    this._subscription = this.getInput$().subscribe(input => this.onContainerStateChanged(input));
  }

  setRenderTooltipContent = (renderTooltipContent: RenderToolTipContent) => {
    this._renderTooltipContent = renderTooltipContent;
  };

  setEventHandlers = (eventHandlers: EventHandlers) => {
    this._eventHandlers = eventHandlers;
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
    refresh,
  }: {
    query?: Query;
    timeRange?: TimeRange;
    filters: Filter[];
    refresh?: boolean;
  }) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._store.dispatch(
      setQuery({
        filters: filters.filter(filter => !filter.meta.disabled),
        query,
        timeFilters: timeRange,
        refresh,
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
    this._store.dispatch(setEventHandlers(this._eventHandlers));
    this._store.dispatch(setReadOnly(true));
    this._store.dispatch(disableScrollZoom());

    if (_.has(this.input, 'isLayerTOCOpen')) {
      this._store.dispatch(setIsLayerTOCOpen(this.input.isLayerTOCOpen));
    }

    if (_.has(this.input, 'openTOCDetails')) {
      this._store.dispatch(setOpenTOCDetails(this.input.openTOCDetails));
    }

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
    }

    this._store.dispatch(replaceLayerList(this._layerList));
    if (this.input.hiddenLayers) {
      this._store.dispatch(setHiddenLayers(this.input.hiddenLayers));
    }
    this._dispatchSetQuery(this.input);
    this._dispatchSetRefreshConfig(this.input);

    this._domNode = domNode;

    const I18nContext = getCoreI18n().Context;

    render(
      <Provider store={this._store}>
        <I18nContext>
          <GisMap
            addFilters={this.input.hideFilterActions ? null : this.addFilters}
            renderTooltipContent={this._renderTooltipContent}
          />
        </I18nContext>
      </Provider>,
      this._domNode
    );

    this._unsubscribeFromStore = this._store.subscribe(() => {
      this._handleStoreChanges();
    });
  }

  async setLayerList(layerList: unknown[]) {
    this._layerList = layerList;
    return await this._store.dispatch(replaceLayerList(this._layerList));
  }

  addFilters = (filters: Filter[]) => {
    getUiActions().executeTriggerActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      filters,
    });
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
      refresh: true,
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
