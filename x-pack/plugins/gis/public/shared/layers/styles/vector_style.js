/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { VectorStyleColorEditor } from './components/vector_style_color_editor';

import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

const DEFAULT_COLOR = '#e6194b';

export class VectorStyle {

  static type = 'VECTOR';
  static DEFAULT_COLOR_HEX = '#ffffff';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptor(propertyType, propertyValue) {
    return {
      type: VectorStyle.type,
      properties: {
        [propertyType]: propertyValue
      }
    };
  }

  static getDisplayName() {
    return 'Vector Style';
  }

  static renderEditor({ handleStyleChange, style, layer }) {


    const handlePropertyChange = (propertyName, settings) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor(propertyName, settings);
      handleStyleChange(vectorStyleDescriptor);
    };

    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <VectorStyleColorEditor
              property={'fillColor'}
              name={"Fill"}
              handlePropertyChange={handlePropertyChange}
              seedStyle={style}
              layer={layer}
            />
            {/*<VectorStyleColorEditor*/}
            {/*property={'outlineColor'}*/}
            {/*name={"Outline"}*/}
            {/*handleStyleChange={handlePropertyChange}*/}
            {/*seedStyle={style}*/}
            {/*layer={layer}*/}
            {/*/>*/}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  getHexColor(colorProperty) {

    if (!this._descriptor.properties[colorProperty]) {
      return null;
    }

    return this._descriptor.properties[colorProperty].options.color;
  }

  isPropertyDynamic(property) {
    if (!this._descriptor.properties[property]) {
      return false;
    }
    return this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  enrichFeatureCollectionWithScaledProps(featureCollection) {

    if (!featureCollection) {
      return false;
    }

    if (!featureCollection.computed) {
      featureCollection.computed = [];
    }


    if (!this._descriptor.properties.fillColor.options.field) {
      return;
    }

    if (featureCollection.computed.find(f => f === this._descriptor.properties.fillColor.options.field)) {
      return false;
    }

    const features = featureCollection.features;
    if (!features.length) {
      return false;
    }
    const fieldName = this._descriptor.properties.fillColor.options.field;
    let min = features[0].properties[fieldName];
    let max = features[0].properties[fieldName];
    for (let i = 1; i < features.length; i++) {
      min = Math.min(min, features[i].properties[fieldName]);
      max = Math.max(max, features[i].properties[fieldName]);
    }

    //scale to 0 -1
    const propName = `__kbn__${fieldName}__`;
    for (let i = 0; i < features.length; i++) {
      features[i].properties[propName] = (features[i].properties[fieldName] - min) / (max - min);
    }
    featureCollection.computed.push(fieldName);
    return true;
  }

  _getDataDrivenColor(property) {

    if (!this._descriptor.properties[property]) {
      return null;
    }

    if (this._descriptor.properties[property].options.field) {
      const targetName = `__kbn__${this._descriptor.properties[property].options.field}__`;
      return [
        'interpolate',
        ['linear'],
        ['get', targetName],
        0 / 8, '#F2F12D',
        1 / 8, '#EED322',
        2 / 8, '#E6B71E',
        3 / 8, '#DA9C20',
        4 / 8, '#CA8323',
        5 / 8, '#B86B25',
        6 / 8, '#A25626',
        7 / 8, '#8B4225',
        8 / 8, '#723122'
      ];
    } else {
      return null;
    }
  }

  setMBPaintProperties(mbMap, sourceId, fillLayerId, lineLayerId, temp) {

    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {}
      });
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {}
      });
    }

    if (this._descriptor.properties.fillColor) {
      let color;
      if (
        this._descriptor.properties.fillColor.type === VectorStyle.STYLE_TYPE.STATIC
      ) {
        color = this.getHexColor('fillColor') || DEFAULT_COLOR;
      } else if (this._descriptor.properties.fillColor.type === VectorStyle.STYLE_TYPE.DYNAMIC) {
        color = this._getDataDrivenColor('fillColor');
      } else {
        throw new Error(`Style type not recognized: ${this._descriptor.properties.fillColor.type}`);
      }
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
    } else {
      mbMap.setPaintProperty(fillLayerId, 'fill-color', null);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', 0);
    }
  }

  setMBPaintPropertiesForPoints(mbMap, sourceId, pointLayerId, temp) {

    const pointLayer = mbMap.getLayer(pointLayerId);
    if (!pointLayer) {
      mbMap.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        paint: {}
      });
    }

    if (this._descriptor.properties.fillColor) {
      let color;
      if (
        this._descriptor.properties.fillColor.type === VectorStyle.STYLE_TYPE.STATIC
      ) {
        color = this.getHexColor('fillColor') || DEFAULT_COLOR;
      } else if (this._descriptor.properties.fillColor.type === VectorStyle.STYLE_TYPE.DYNAMIC) {
        color = this._getDataDrivenColor('fillColor');
      } else {
        throw new Error(`Style type not recognized: ${this._descriptor.properties.fillColor.type}`);
      }
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 10);
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', temp ? 0.4 : 0.5);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 0);
      mbMap.setPaintProperty(pointLayerId, 'circle-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', 0);
    }
  }

}
