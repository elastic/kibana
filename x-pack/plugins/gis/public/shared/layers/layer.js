/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
    layerDescriptor.source = options.source;
    layerDescriptor.sourceDescriptor = options.sourceDescriptor;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    return layerDescriptor;
  }

  getDisplayName() {
    return this._source.getDisplayName() || `Layer ${this._descriptor.id}`;
  }

  getId() {
    return this._descriptor.id;
  }

  isVisible() {
    return this._descriptor.visible;
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

  async syncDataToMapState() {
    //no-op by default
  }

}

