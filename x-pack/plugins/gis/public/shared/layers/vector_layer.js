/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { FillAndOutlineStyle } from './styles/fill_and_outline_style';
import { getOlLayerStyle } from '../ol_layer_defaults';
import * as ol from 'openlayers';
import { endDataLoad, startDataLoad } from '../../actions/store_actions';

export class VectorLayer extends ALayer {

  static type = 'VECTOR';

  static createDescriptor(options) {
    const vectorLayerDescriptor = super.createDescriptor(options);
    vectorLayerDescriptor.type = VectorLayer.type;
    vectorLayerDescriptor.style = {
      ...vectorLayerDescriptor.style,
      ...this._applyDefaultStyle()
    };
    return vectorLayerDescriptor;
  }

  static _applyDefaultStyle = (() => {
    //todo: should follow fixed ordering, similar to POC
    const defaultColors = ['#e6194b', '#3cb44b', '#ffe119', '#f58231', '#911eb4'];
    let defaultColorIndex = 0;
    return () => {
      defaultColorIndex = defaultColorIndex >= defaultColors.length
        ? 0 : defaultColorIndex;
      return FillAndOutlineStyle.createDescriptor(defaultColors[defaultColorIndex++]);
    };
  })();

  getSupportedStyles() {
    //todo: this should be data-dependent (e.g. point data will not have FillAndOutlineStyle)
    return [FillAndOutlineStyle];
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async syncDataToMapState(mapState, requestToken, dispatch) {
    if (this._descriptor.data || this._descriptor.dataRequestToken) {
      return;
    }
    dispatch(startDataLoad(this.getId(), mapState, requestToken));
    const data = await this._source.getGeoJson();
    dispatch(endDataLoad(this.getId(), data, requestToken));
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });
      mbMap.addLayer({
        id: this.getId() + '_fill',
        type: 'fill',
        source: this.getId(),
        paint: {
          'fill-color': 'rgb(220,0,0)',
          'fill-opacity': 0.6
        }
      });
    }

    const mbSourceAfter = mbMap.getSource(this.getId());

    //todo: similar problem as OL here. keeping track of data on source
    if (this._descriptor.data !== mbSourceAfter._data) {
      mbSourceAfter.setData(this._descriptor.data);
    }

    mbMap.setLayoutProperty(this.getId() + '_fill', 'visibility', this.isVisible() ? 'visible' : 'none');
  }

  _createCorrespondingOLLayer() {
    const vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: []
      }),
      renderMode: 'image'
    });
    vectorLayer.setVisible(this.isVisible());
    const style = this.getCurrentStyle();
    vectorLayer.setStyle(getOlLayerStyle(style, this.isTemporary()));
    return vectorLayer;
  }

  _syncOLStyle(olLayer) {
    const style = this.getCurrentStyle();
    const appliedStyle = getOlLayerStyle(style, this.isTemporary());
    olLayer.setStyle(appliedStyle);
  }

  _syncOLData(olLayer) {
    return this._syncOLWithCurrentDataAsVectors(olLayer);
  }


}
