/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FlyOut } from './flyout';
import * as ol from 'openlayers';
import eventEmitter from 'event-emitter';

export class KibanaMap extends React.Component {

  constructor() {
    super();
    this._kbnOLLayers = [];
    this._layerListeners = [];
  }

  componentDidMount() {
    const olView = new ol.View({
      center: ol.proj.fromLonLat([37.41, 8.82]),
      zoom: 4
    });
    this._olMap = new ol.Map({
      target: this.refs.mapContainer,
      layers: [],
      view: olView
    });
  }

  getLayerById(id) {
    const index = this._kbnOLLayers.findIndex(layerTuple => layerTuple.kbnLayer.getId() === id);
    return (index >= 0) ? this._kbnOLLayers[index].kbnLayer : null;
  }

  reorderLayers(orderedLayers) {
    const newLayerOrder = [];
    for (let i = 0; i < orderedLayers.length; i++) {
      const tuple = this._kbnOLLayers.find(layerTuple => {
        return layerTuple.kbnLayer === orderedLayers[i];
      });
      if (tuple) {
        newLayerOrder.push(tuple);
        this._olMap.removeLayer(tuple.olLayer);
      }
    }
    this._kbnOLLayers = newLayerOrder;
    this._kbnOLLayers.forEach((tuple) => {
      this._olMap.addLayer(tuple.olLayer);
    });
    this.emit('layers:reordered');
  }

  destroy() {
    //todo (cleanup olMap etc...)
    this._layerListeners.forEach((listener) => listener.remove());
    this._layerListeners = null;
  }

  removeLayer(layer) {

    const index = this._kbnOLLayers.findIndex(layerTuple => {
      return layerTuple.kbnLayer === layer;
    });

    if (index < 0) {
      console.warn("Trying to remove layer that is not on the map.");
      return;
    }

    const toRemove = this._kbnOLLayers[index];
    this._olMap.removeLayer(toRemove.olLayer);
    this._kbnOLLayers.splice(index, 1);
    this._layerListeners = this._layerListeners.filter(listener => {
      if (listener.kbnLayer === layer) {
        listener.remove();
        return false;
      } else {
        return true;
      }
    });

    this.emit('layer:removed');
  }

  async addLayer(layer) {

    const olLayer = await layer.getOLLayer();
    if (!olLayer) {
      console.error('Cannot get OLLayer');
      return;
    }

    const onVisibilityChanged = (layer) => {
      const layerTuple = this._kbnOLLayers.find((layerTuple) => {
        return (layer === layerTuple.kbnLayer);
      });
      if (layerTuple) {
        layerTuple.olLayer.setVisible(layer.getVisibility());
        this.emit('layer:visibilityChanged', layer);
      }
    };
    layer.on('visibilityChanged', onVisibilityChanged);
    this._layerListeners.push({
      kbnLayer: layer,
      remove: () => {
        layer.off('visibilityChanged', onVisibilityChanged);
      }
    });
    this._kbnOLLayers.push({
      kbnLayer: layer,
      olLayer: olLayer
    });
    this._olMap.addLayer(olLayer);
    this.emit("layer:added", layer);
  }

  getLayers() {
    return this._kbnOLLayers.map(layerTuple => layerTuple.kbnLayer);
  }

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        <FlyOut/>
      </div>
    );
  }
}

eventEmitter(KibanaMap.prototype);
