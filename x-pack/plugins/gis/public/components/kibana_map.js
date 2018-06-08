/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import eventEmitter from 'event-emitter';
import React from 'react';
import * as ol from 'openlayers';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiText,
  EuiHorizontalRule,
  EuiAccordion,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiTitle,
  EuiTextColor,
} from '@elastic/eui';
import IndexPatternImport from './index_pattern_import';

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

  _renderFlyout() {
    const handlePreviewLayer = () => console.log("Handle preview layer placeholder");
    return (
      <EuiFlyout onClose={this.props.onClose} style={{ maxWidth: 768 }}>
        <EuiFlyoutHeader>
          <EuiTitle size="l">
            <h2>Add layer</h2>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiTextColor color="subdued">
            <EuiText size="s">
              <p>Choose a source from one of the following options, then click Add to map to continue.</p>
            </EuiText>
          </EuiTextColor>
          <EuiSpacer/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlyoutHeader>

        <EuiFlyoutBody style={{ paddingTop: 0 }}>
          <EuiAccordion
            id="addIndexPattern"
            className="euiAccordionForm"
            buttonClassName="euiAccordionForm__button"
            buttonContent="From Elasticsearch index"
            initialIsOpen={true}
            ref={(ref) => this._ipAccordion = ref}
            onClick={this._onIPClick}
          >
            <div className="euiAccordionForm__children">
              <IndexPatternImport kibanaMap={this._kibanaMap} onPreviewLayer={handlePreviewLayer}/>
            </div>
          </EuiAccordion>

          <EuiAccordion
            id="addEMS"
            className="euiAccordionForm"
            buttonClassName="euiAccordionForm__button"
            buttonContent="Import from Elastic Maps Service"
            initialIsOpen={false}
            ref={(ref) => this._emsAccordion = ref}
            onClick={this._onEMSClick}
          >
            <div className="euiAccordionForm__children"/>
          </EuiAccordion>

          <EuiAccordion
            id="addFile"
            className="euiAccordionForm"
            buttonClassName="euiAccordionForm__button"
            buttonContent="Import from local file"
            initialIsOpen={false}
            ref={(ref) => this._fileAccordion = ref}
            onClick={this._onFileClick}
          >
            <div className="euiAccordionForm__children"/>
          </EuiAccordion>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  render() {
    // const flyout = this._renderFlyout();
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        {/*{flyout}*/}
      </div>
    );
  }
}

eventEmitter(KibanaMap.prototype);
