/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FlyOut } from '../flyout/index';
import * as ol from 'openlayers';
import eventEmitter from 'event-emitter';
import _ from 'lodash';

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
    this.addLayers(this.props.olLayers);
  }

  addLayers = (layers) => {
    _.each(layers, (layersArr) => {
      layersArr.forEach(layer=> this._olMap.addLayer(layer));
    });
  };

  componentWillReceiveProps(props) {
    this.addLayers(props.olLayers);
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
