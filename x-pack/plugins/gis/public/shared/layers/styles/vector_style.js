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
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  static getComputedFieldName(fieldName) {
    return `__kbn__scaled(${fieldName})`;
  }

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptorForSingleProperty(propertyType, propertyValue) {
    return VectorStyle.createDescriptor({
      [propertyType]: propertyValue
    });
  }

  static createDescriptor(properties) {
    return {
      type: VectorStyle.type,
      properties: properties
    };
  }

  static getDisplayName() {
    return 'Vector Style';
  }

  static renderEditor({ handleStyleChange, style, layer }) {

    const properties = { ...style.getProperties() };
    const handlePropertyChange = (propertyName, settings) => {
      properties[propertyName] = settings;//override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(properties);
      handleStyleChange(vectorStyleDescriptor);
    };

    return (
      <Fragment>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <VectorStyleColorEditor
              property={'fillColor'}
              name={"Fill color"}
              handlePropertyChange={handlePropertyChange}
              colorStyleDescriptor={properties.fillColor}
              layer={layer}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <VectorStyleColorEditor
              property={'lineColor'}
              name={"Line color"}
              handlePropertyChange={handlePropertyChange}
              colorStyleDescriptor={properties.lineColor}
              layer={layer}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  getProperties() {
    return this._descriptor.properties || {};
  }

  getHexColor(colorProperty) {

    if (!this._descriptor.properties[colorProperty] || !this._descriptor.properties[colorProperty].options) {
      return null;
    }

    return this._descriptor.properties[colorProperty].options.color;
  }

  _isPropertyDynamic(property) {
    if (!this._descriptor.properties[property]) {
      return false;
    }
    return this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  static computeScaledValues(featureCollection, field) {
    const fieldName = field.name;
    const features = featureCollection.features;
    if (!features.length) {
      return false;
    }

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < features.length; i++) {
      const newValue = parseFloat(features[i].properties[fieldName]);
      if (!isNaN(newValue)) {
        min = Math.min(min, newValue);
        max = Math.max(max, newValue);
      }
    }

    //scale to [0,1]
    const propName = VectorStyle.getComputedFieldName(fieldName);
    for (let i = 0; i < features.length; i++) {
      features[i].properties[propName] = (features[i].properties[fieldName] - min) / (max - min);
    }
    featureCollection.computed.push(fieldName);
    return true;
  }

  addScaledPropertiesBasedOnStyle(featureCollection) {

    if (!this._isPropertyDynamic('fillColor') && !this._isPropertyDynamic('lineColor')) {
      return false;
    }

    if (!featureCollection) {
      return false;
    }

    if (!featureCollection.computed) {
      featureCollection.computed = [];
    }

    const dynamicFields = [];
    //todo: should always be intialized really
    if (this._descriptor.properties.fillColor && this._descriptor.properties.fillColor.options
      && this._descriptor.properties.fillColor.options.fieldValue) {
      dynamicFields.push(this._descriptor.properties.fillColor.options.fieldValue);
    }
    if (this._descriptor.properties.lineColor && this._descriptor.properties.lineColor.options
      && this._descriptor.properties.lineColor.options.fieldValue) {
      dynamicFields.push(this._descriptor.properties.lineColor.options.fieldValue);
    }

    const updateStatuses = dynamicFields.map((field) => {
      return VectorStyle.computeScaledValues(featureCollection, field);
    });
    return updateStatuses.some(r => r === true);

  }

  _getMBDataDrivenColor(property) {

    if (!this._descriptor.properties[property] || !this._descriptor.properties[property].options) {
      return null;
    }

    if (this._descriptor.properties[property].options.fieldValue) {
      const originalFieldName = this._descriptor.properties[property].options.fieldValue.name;
      const targetName = VectorStyle.getComputedFieldName(originalFieldName);
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

  _getMBColor(property) {
    let color;
    if (
      this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.STATIC
    ) {
      color = this.getHexColor(property) || DEFAULT_COLOR;
    } else if (this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.DYNAMIC) {
      color = this._getMBDataDrivenColor(property);
    } else {
      throw new Error(`Style type not recognized: ${this._descriptor.properties[property].type}`);
    }
    return color;
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
      const color = this._getMBColor('fillColor');
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
    } else {
      mbMap.setPaintProperty(fillLayerId, 'fill-color', null);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', 0);
    }

    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor('lineColor');
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', temp ? 0.4 : 0.5);
      mbMap.setPaintProperty(lineLayerId, 'line-width', temp ? 1 : 2);
    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-color', null);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', 0);
      mbMap.setPaintProperty(lineLayerId, 'line-width', 0);
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
      const color = this._getMBColor('fillColor');
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
