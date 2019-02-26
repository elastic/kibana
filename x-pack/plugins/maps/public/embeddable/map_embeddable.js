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
} from '../actions/store_actions';
import { setReadOnly } from '../store/ui';
import { getInspectorAdapters } from '../store/non_serializable_instances';

export class MapEmbeddable extends Embeddable {

  constructor({ onEmbeddableStateChanged, savedMap, editUrl, indexPatterns = [] }) {
    super({ title: savedMap.title, editUrl, indexPatterns });

    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedMap = savedMap;
    this.store = createMapStore();
  }

  getInspectorAdapters() {
    return getInspectorAdapters(this.store.getState());
  }

  onContainerStateChanged(containerState) {
    if (!_.isEqual(containerState.timeRange, this.prevTimeRange) ||
        !_.isEqual(containerState.query, this.prevQuery) ||
        !_.isEqual(containerState.filters, this.prevFilters)) {
      this.dispatchSetQuery(containerState);
    }
  }

  dispatchSetQuery({ query, timeRange, filters }) {
    this.prevTimeRange = timeRange;
    this.prevQuery = query;
    this.prevFilters = filters;
    this.store.dispatch(setQuery({
      filters: filters.filter(filter => !filter.meta.disabled),
      query,
      timeFilters: timeRange,
    }));
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode, containerState) {
    this.store.dispatch(setReadOnly(true));
    // todo get center and zoom from embeddable UI state
    if (this.savedMap.mapStateJSON) {
      const mapState = JSON.parse(this.savedMap.mapStateJSON);
      this.store.dispatch(setGotoWithCenter({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      }));
    }
    const layerList = getInitialLayers(this.savedMap.layerListJSON);
    this.store.dispatch(replaceLayerList(layerList));
    this.dispatchSetQuery(containerState);

    render(
      <Provider store={this.store}>
        <I18nContext>
          <GisMap/>
        </I18nContext>
      </Provider>,
      domNode
    );
  }

  destroy() {
    this.savedMap.destroy();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
  }

  reload() {
    this.dispatchSetQuery();
  }
}
