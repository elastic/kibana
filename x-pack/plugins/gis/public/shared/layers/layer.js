/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

export class ALayer {

  constructor({ layerDescriptor, source, style }) {
    this._descriptor = layerDescriptor;
    this._source = source;
    this._style = style;
  }

  static createDescriptor(options) {
    const layerDescriptor = {};
    layerDescriptor.data = options.data || null;
    layerDescriptor.dataMeta = options.dataMeta || {};
    layerDescriptor.dataDirty = typeof options.dataDirty === 'boolean' ? options.dataDirty : false;
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
    return false;
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

}

