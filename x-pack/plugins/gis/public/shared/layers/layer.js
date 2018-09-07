/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OL_GEOJSON_FORMAT } from '../ol_layer_defaults';

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

  getType() {
    return this._descriptor.type;
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

  syncLayerWithOL(olMap, dataSources, newPosition) {
    const olLayers = olMap.getLayers();
    const olLayerArray = olLayers.getArray();
    let olLayer = olLayerArray.find(olLayer => olLayer.get('id') === this.getId());
    if (!olLayer) {
      olLayer = this._createCorrespondingOLLayer(dataSources, olMap);
      olLayer.set('id', this.getId());
      olMap.addLayer(olLayer);
    } else {
      const actualPosition = olLayerArray.indexOf(olLayer);
      if (actualPosition !== newPosition) {
        olMap.removeLayer(olLayer);
        olLayers.insertAt(newPosition, olLayer);
      }
    }
    olLayer.setVisible(this.isVisible());
    this._syncOLStyle(olLayer, olMap);
    this._syncOLData(olLayer);
  }

  syncLayerWithMB(mbMap, dataSources) {
    console.warn('Layers should implement syncing their state with mapbox', mbMap, dataSources);
  }

  _syncOLStyle() {
    //no-op by default
  }

  _syncOLWithCurrentDataAsVectors(olLayer) {

    if (!this._descriptor.data) {
      return;
    }
    //ugly, but it's what we have now
    //think about stateful-shim that mirrors OL (or Mb) that can keep these links
    //but for now, the OpenLayers object model remains our source of truth
    if (this._descriptor.data === olLayer.__kbn_data__) {
      return;
    } else {
      olLayer.__kbn_data__ = this._descriptor.data;
    }

    const olSource = olLayer.getSource();
    olSource.clear();
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.data);
    olSource.addFeatures(olFeatures);
  }

  _createCorrespondingOLLayer() {
    throw new Error('Should implement Layer#createCorrespondingOLLayer');
  }

  _syncOLData() {
    //no-op by default
  }

}

