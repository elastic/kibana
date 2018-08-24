/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';
import { FillAndOutlineStyle } from './styles/fill_and_outline_style';
import { getOlLayerStyle, OL_GEOJSON_FORMAT } from '../ol_layer_defaults';
import * as ol from 'openlayers';

export class VectorLayer extends ALayer {

  static type = LAYER_TYPE.VECTOR;

  static createDescriptor(options) {
    const vectorLayerDescriptor = super.createDescriptor(options);
    vectorLayerDescriptor.type = LAYER_TYPE.VECTOR;
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

  getCurrentStyle() {
    if (this._descriptor.style.type === FillAndOutlineStyle.type) {
      return new FillAndOutlineStyle(this._descriptor.style);
    } else {
      throw new Error('Style type not recognized by VectorLayer');
    }
  }

  createCorrespondingOLLayer() {
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.source);
    const vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: olFeatures
      }),
      renderMode: 'image'
    });
    vectorLayer.setVisible(this.isVisible());
    const style = this.getCurrentStyle();
    vectorLayer.setStyle(getOlLayerStyle(style, this.isTemporary()));
    return vectorLayer;
  }

}
