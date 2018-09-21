/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { VectorStyle } from './styles/vector_style';

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
      return VectorStyle.createDescriptor(defaultColors[defaultColorIndex++]);
    };
  })();

  getSupportedStyles() {
    return [VectorStyle];
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async syncData(startLoading, stopLoading) {
    if (this._descriptor.data || this._descriptor.dataRequestToken) {
      return;
    }
    startLoading();
    const data = await this._source.getGeoJson({
      layerId: this._descriptor.id,
      layerName: this._descriptor.label,
    });
    stopLoading(data);
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());

    const fillLayerId = this.getId() +  '_fill';
    const strokeLayerId = this.getId() +  '_line';
    const pointLayerId = this.getId() +  '_circle';

    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });


      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: this.getId(),
        paint: {}
      });
      mbMap.addLayer({
        id: strokeLayerId,
        type: 'line',
        source: this.getId(),
        paint: {}
      });
    }

    //todo: similar problem as OL here. keeping track of data via MB source directly
    const mbSourceAfter = mbMap.getSource(this.getId());
    if (this._descriptor.data !== mbSourceAfter._data) {
      mbSourceAfter.setData(this._descriptor.data);
    }

    let isPointsOnly = true;
    if (this._descriptor.data) {
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        if (this._descriptor.data.features[i].geometry.type !== 'Point') {
          isPointsOnly = false;
          break;
        }
      }
    } else {
      isPointsOnly = false;
    }

    if (isPointsOnly) {
      //todo: hack, but want to get some quick visual indication for points data
      //cannot map single kibana layer to single mapbox source
      this._style.addMbPointsLayerAndSetMBPaintProperties(mbMap, this.getId(), pointLayerId, this.isTemporary());
    } else {
      this._style.setMBPaintProperties(mbMap, fillLayerId, strokeLayerId, this.isTemporary());
    }
    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(strokeLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');

  }

}
