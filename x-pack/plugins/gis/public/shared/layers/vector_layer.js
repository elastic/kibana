/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { FillAndOutlineStyle } from './styles/fill_and_outline_style';

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

  async syncDataToMapState(startLoading, stopLoading) {
    if (this._descriptor.data || this._descriptor.dataRequestToken) {
      return;
    }
    startLoading();
    const data = await this._source.getGeoJson();
    stopLoading(data);
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());

    const fillLayerId = this.getId() +  '_fill';
    const strokeLayerId = this.getId() +  '_line';

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
    this._style.setMBPaintProperties(mbMap, fillLayerId, strokeLayerId, this.isTemporary());


    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(strokeLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
  }

}
