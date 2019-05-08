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

import { Embeddable } from 'ui/embeddable';
import { I18nContext } from 'ui/i18n';

import { GisMap } from '../components/gis_map';
import { createMapStore } from '../store/store';
import { getInitialLayers } from '../angular/get_initial_layers';
import {
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  setRefreshConfig,
  disableScrollZoom,
} from '../actions/store_actions';
import {
  DEFAULT_IS_LAYER_TOC_OPEN,
  getIsLayerTOCOpen,
  getOpenTOCDetails,
  setReadOnly,
  setFilterable,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../store/ui';
import { getInspectorAdapters } from '../store/non_serializable_instances';
import { getMapCenter, getMapZoom } from '../selectors/map_selectors';

export class MapEmbeddable extends Embeddable {

  constructor({
    onEmbeddableStateChanged,
    embeddableConfig,
    savedMap,
    editUrl,
    editable,
    indexPatterns = []
  }) {
    super({ title: savedMap.title, editUrl, editable, indexPatterns });

    this._onEmbeddableStateChanged = onEmbeddableStateChanged;
    this._embeddableConfig = _.cloneDeep(embeddableConfig);
    this._savedMap = savedMap;
    this._store = createMapStore();
  }

  getInspectorAdapters() {
    return getInspectorAdapters(this._store.getState());
  }

  onContainerStateChanged(containerState) {
    if (!_.isEqual(containerState.timeRange, this._prevTimeRange) ||
        !_.isEqual(containerState.query, this._prevQuery) ||
        !_.isEqual(containerState.filters, this._prevFilters)) {
      this._dispatchSetQuery(containerState);
    }

    if (!_.isEqual(containerState.refreshConfig, this._prevRefreshConfig)) {
      this._dispatchSetRefreshConfig(containerState);
    }
  }

  _dispatchSetQuery({ query, timeRange, filters }) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._store.dispatch(setQuery({
      filters: filters.filter(filter => !filter.meta.disabled),
      query,
      timeFilters: timeRange,
    }));
  }

  _dispatchSetRefreshConfig({ refreshConfig }) {
    this._prevRefreshConfig = refreshConfig;
    this._store.dispatch(setRefreshConfig(refreshConfig));
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode, containerState) {
    this._store.dispatch(setReadOnly(true));
    this._store.dispatch(setFilterable(true));
    this._store.dispatch(disableScrollZoom());

    if (_.has(this._embeddableConfig, 'isLayerTOCOpen')) {
      this._store.dispatch(setIsLayerTOCOpen(this._embeddableConfig.isLayerTOCOpen));
    } else if (this._savedMap.uiStateJSON) {
      const uiState = JSON.parse(this._savedMap.uiStateJSON);
      this._store.dispatch(setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN)));
    }

    if (_.has(this._embeddableConfig, 'openTOCDetails')) {
      this._store.dispatch(setOpenTOCDetails(this._embeddableConfig.openTOCDetails));
    } else if (this._savedMap.uiStateJSON) {
      const uiState = JSON.parse(this._savedMap.uiStateJSON);
      this._store.dispatch(setOpenTOCDetails(_.get(uiState, 'openTOCDetails', [])));
    }

    if (this._embeddableConfig.mapCenter) {
      this._store.dispatch(setGotoWithCenter({
        lat: this._embeddableConfig.mapCenter.lat,
        lon: this._embeddableConfig.mapCenter.lon,
        zoom: this._embeddableConfig.mapCenter.zoom,
      }));
    } else if (this._savedMap.mapStateJSON) {
      const mapState = JSON.parse(this._savedMap.mapStateJSON);
      this._store.dispatch(setGotoWithCenter({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      }));
    }
    const layerList = getInitialLayers(this._savedMap.layerListJSON);
    this._store.dispatch(replaceLayerList(layerList));
    this._dispatchSetQuery(containerState);
    this._dispatchSetRefreshConfig(containerState);

    render(
      <Provider store={this._store}>
        <I18nContext>
          <GisMap/>
        </I18nContext>
      </Provider>,
      domNode
    );

    this._unsubscribeFromStore = this._store.subscribe(() => {
      this._handleStoreChanges();
    });
  }

  destroy() {
    if (this._unsubscribeFromStore) {
      this._unsubscribeFromStore();
    }
    this._savedMap.destroy();
    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }
  }

  reload() {
    this._dispatchSetQuery({
      query: this._prevQuery,
      timeRange: this._prevTimeRange,
      filters: this._prevFilters
    });
  }

  _handleStoreChanges() {
    let embeddableConfigChanged = false;

    const center = getMapCenter(this._store.getState());
    const zoom = getMapZoom(this._store.getState());
    if (!this._embeddableConfig.mapCenter
      || this._embeddableConfig.mapCenter.lat !== center.lat
      || this._embeddableConfig.mapCenter.lon !== center.lon
      || this._embeddableConfig.mapCenter.zoom !== zoom) {
      embeddableConfigChanged = true;
      this._embeddableConfig.mapCenter = {
        lat: center.lat,
        lon: center.lon,
        zoom: zoom,
      };
    }

    const isLayerTOCOpen = getIsLayerTOCOpen(this._store.getState());
    if (this._embeddableConfig.isLayerTOCOpen !== isLayerTOCOpen) {
      embeddableConfigChanged = true;
      this._embeddableConfig.isLayerTOCOpen = isLayerTOCOpen;
    }

    const openTOCDetails = getOpenTOCDetails(this._store.getState());
    if (!_.isEqual(this._embeddableConfig.openTOCDetails, openTOCDetails)) {
      embeddableConfigChanged = true;
      this._embeddableConfig.openTOCDetails = openTOCDetails;
    }

    if (embeddableConfigChanged) {
      this._onEmbeddableStateChanged({
        customization: this._embeddableConfig
      });
    }
  }
}
