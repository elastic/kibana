/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { DataRequest } from './util/data_request';

export class ALayer {

  constructor({ layerDescriptor, source, style }) {
    this._descriptor = layerDescriptor;
    this._source = source;
    this._style = style;
    this._listenersMap = new Map(); // key is mbLayerId, value eventHandlers map

    if (this._descriptor.dataRequests) {
      this._dataRequests = this._descriptor.dataRequests.map(dataRequest => new DataRequest(dataRequest));
    } else {
      this._dataRequests = [];
    }
  }

  static createDescriptor(options) {
    const layerDescriptor = {};

    layerDescriptor.dataRequests = [];
    layerDescriptor.id = Math.random().toString(36).substr(2, 5);
    layerDescriptor.label = options.label && options.label.length > 0 ? options.label : null;
    layerDescriptor.showAtAllZoomLevels = _.get(options, 'showAtAllZoomLevels', true);
    layerDescriptor.minZoom = _.get(options, 'minZoom', 0);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', 24);
    layerDescriptor.source = options.source;
    layerDescriptor.sourceDescriptor = options.sourceDescriptor;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    return layerDescriptor;
  }

  destroy(mbMap) {
    this.removeAllListeners(mbMap);
  }

  removeAllListeners(mbMap) {
    this._listenersMap.forEach((value, mbLayerId) => {
      this.removeAllListenersForMbLayer(mbMap, mbLayerId);
    });
  }

  removeAllListenersForMbLayer(mbMap, mbLayerId) {
    if (this._listenersMap.has(mbLayerId)) {
      const eventHandlersMap = this._listenersMap.get(mbLayerId);
      eventHandlersMap.forEach((value, eventType) => {
        this.removeEventListenerForMbLayer(mbMap, mbLayerId, eventType);
      });
      this._listenersMap.delete(mbLayerId);
    }
  }

  removeEventListenerForMbLayer(mbMap, mbLayerId, eventType) {
    if (this._listenersMap.has(mbLayerId)) {
      const eventHandlersMap = this._listenersMap.get(mbLayerId);
      if (eventHandlersMap.has(eventType)) {
        mbMap.off(eventType, mbLayerId, eventHandlersMap.get(eventType));
      }
    }
  }

  addEventListenerForMbLayer(mbMap, mbLayerId, eventType, handler) {
    mbMap.on(eventType, mbLayerId, handler);

    const eventHandlersMap = !this._listenersMap.has(mbLayerId)
      ? new Map()
      : this._listenersMap.get(mbLayerId);
    eventHandlersMap.set(eventType, handler);
    this._listenersMap.set(mbLayerId, eventHandlersMap);
  }

  isJoinable() {
    return false;
  }

  getDisplayName() {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    return this._source.getDisplayName() || `Layer ${this._descriptor.id}`;
  }

  getId() {
    return this._descriptor.id;
  }

  getSource() {
    return this._source;
  }

  isVisible() {
    return this._descriptor.visible;
  }

  showAtZoomLevel(zoom) {
    if (this._descriptor.showAtAllZoomLevels) {
      return true;
    }

    if (zoom >= this._descriptor.minZoom && zoom <= this._descriptor.maxZoom) {
      return true;
    }

    return false;
  }

  getZoomConfig() {
    return {
      showAtAllZoomLevels: this._descriptor.showAtAllZoomLevels,
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  isTemporary() {
    return this._descriptor.temporary;
  }

  getSupportedStyles() {
    return [];
  }

  getCurrentStyle() {
    return this._style;
  }

  renderSourceDetails() {
    return this._source.renderDetails();
  }

  isLayerLoading() {
    return this._dataRequests.some(dataRequest => dataRequest.isLoading());
  }

  dataHasLoadError() {
    return this._dataRequests.some(dataRequest => dataRequest.hasLoadError());
  }

  getDataLoadError() {
    const loadErrors =  this._dataRequests.filter(dataRequest => dataRequest.hasLoadError());
    return loadErrors.join(',');//todo
  }

  toLayerDescriptor() {
    return this._descriptor;
  }

  async syncData() {
    //no-op by default
  }

  renderStyleEditor(style, options) {
    return style.renderEditor(options);
  }

  getSourceDataRequest() {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === 'source');
  }

}

