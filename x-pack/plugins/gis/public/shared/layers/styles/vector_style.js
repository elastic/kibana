/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { FillableCircle, FillableVector } from '../../icons/additional_layer_icons';
import { ColorGradient } from '../../icons/color_gradient';
import { getHexColorRangeStrings } from '../../utils/color_utils';
import { VectorStyleEditor } from './components/vector/vector_style_editor';

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

  static createDescriptor(properties) {
    return {
      type: VectorStyle.type,
      properties: properties
    };
  }

  static getDisplayName() {
    return 'Vector style';
  }

  static description = 'Link styles to property values for data driven styling.';

  static renderEditor({ handleStyleChange, style, layer }) {

    const styleProperties = { ...style.getProperties() };
    const handlePropertyChange = (propertyName, settings) => {
      styleProperties[propertyName] = settings;//override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(styleProperties);
      handleStyleChange(vectorStyleDescriptor);
    };

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        layer={layer}
      />
    );
  }

  getSourceFieldNames() {
    const properties = this.getProperties();
    const fieldNames = [];
    Object.keys(properties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const field = _.get(properties[propertyName], 'options.field', {});
      if (field.origin === 'source' && field.name) {
        fieldNames.push(field.name);
      }
    });

    return fieldNames;
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

  getIcon= (() => {
    const defaultStyle = {
      stroke: 'grey',
      strokeWidth: '1px',
      fill: 'none'
    };

    return (isPointsOnly = false) => {
      let style = {
        ...defaultStyle
      };
      const isDynamic = this._isPropertyDynamic('fillColor');
      if (!isDynamic) {
        const { fillColor, lineColor } = this._descriptor.properties;
        const stroke = _.get(lineColor, 'options.color');
        const fill = _.get(fillColor, 'options.color');

        style = {
          ...style,
          ...stroke && { stroke },
          ...fill && { fill },
        };
      }

      return (
        isPointsOnly
          ? <FillableCircle style={style}/>
          : <FillableVector style={style}/>
      );
    };
  })();

  getColorRamp() {
    const color = _.get(this._descriptor, 'properties.fillColor.options.color');
    return color && this._isPropertyDynamic('fillColor')
      ? <ColorGradient color={color}/>
      : null;
  }

  getTOCDetails() {
    const isDynamic = this._isPropertyDynamic('fillColor');
    if (isDynamic) {
      return (
        <React.Fragment>
          {this.getColorRamp()}
        </React.Fragment>
      );
    }
    return null;
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
    if (
      !this._isPropertyDynamic('fillColor') &&
      !this._isPropertyDynamic('lineColor') &&
      !this._isPropertyDynamic('iconSize') &&
      !this._isPropertyDynamic('lineWidth')
    ) {
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
    //todo: don't hardcode styling properties. can be discovered automatically
    //todo: this is adding duplicate fields..
    if (this._descriptor.properties.fillColor && this._descriptor.properties.fillColor.options
      && this._descriptor.properties.fillColor.options.field) {
      dynamicFields.push(this._descriptor.properties.fillColor.options.field);
    }
    if (this._descriptor.properties.lineColor && this._descriptor.properties.lineColor.options
      && this._descriptor.properties.lineColor.options.field) {
      dynamicFields.push(this._descriptor.properties.lineColor.options.field);
    }
    if (this._descriptor.properties.iconSize && this._descriptor.properties.iconSize.options
      && this._descriptor.properties.iconSize.options.field) {
      dynamicFields.push(this._descriptor.properties.iconSize.options.field);
    }
    if (this._descriptor.properties.lineWidth && this._descriptor.properties.lineWidth.options
      && this._descriptor.properties.lineWidth.options.field) {
      dynamicFields.push(this._descriptor.properties.lineWidth.options.field);
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
    const { field, color } = this._descriptor.properties[property].options;
    if (field && color) {
      const colorRange = getHexColorRangeStrings(color, 8)
        .reduce((accu, curColor, idx, srcArr) => {
          accu = [ ...accu, idx / srcArr.length, curColor ];
          return accu;
        }, []);
      const originalFieldName = this._descriptor.properties[property].options.field.name;
      const targetName = VectorStyle.getComputedFieldName(originalFieldName);
      return [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', targetName], -1],
        -1, 'rgba(0,0,0,0)',
        ...colorRange
      ];
    } else {
      return null;
    }
  }


  _getMbDataDrivenSize(property) {

    if (!this._descriptor.properties[property] || !this._descriptor.properties[property].options) {
      return null;
    }

    const { minSize, maxSize } = this._descriptor.properties[property].options;
    if (typeof minSize === 'number' && typeof maxSize === 'number') {
      const originalFieldName = this._descriptor.properties[property].options.field.name;
      const targetName = VectorStyle.getComputedFieldName(originalFieldName);
      return   ['interpolate',
        ['linear'],
        ['get', targetName],
        0, minSize,
        1, maxSize
      ];
    } else {
      return null;
    }
  }



  _getMBColor(property) {
    let color;

    const hasFields = _.get(this._descriptor.properties[property].options, 'field', false)
      && _.get(this._descriptor.properties[property].options, 'color', false);
    const isStatic = this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.STATIC;

    if (isStatic || !hasFields) {
      color = this.getHexColor(property);
    } else {
      color = this._getMBDataDrivenColor(property);
    }
    return color;
  }

  _getMBOpacity() {
    const DEFAULT_OPACITY = 1;
    const opacity = typeof this._descriptor.properties.alphaValue === 'number' ? this._descriptor.properties.alphaValue : DEFAULT_OPACITY;
    return opacity;
  }

  _getMbSize(property) {
    if (this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.STATIC) {
      return this._descriptor.properties[property].options.size;
    } else {
      return this._getMbDataDrivenSize(property);
    }
  }

  setMBPaintProperties(mbMap, sourceId, fillLayerId, lineLayerId) {
    const opacity = this._getMBOpacity();

    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor('fillColor');
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', opacity);
    } else {
      mbMap.setPaintProperty(fillLayerId, 'fill-color', null);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', 0);
    }

    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor('lineColor');
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', opacity);

    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-color', null);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', 0);
    }

    if (this._descriptor.properties.lineWidth && this._descriptor.properties.lineWidth.options) {
      const lineWidth = this._getMbSize('lineWidth');
      mbMap.setPaintProperty(lineLayerId, 'line-width', lineWidth);
    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-width', 0);
    }
  }

  setMBPaintPropertiesForPoints(mbMap, sourceId, pointLayerId) {
    const opacity = this._getMBOpacity();
    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor('fillColor');
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', opacity);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', 0);
    }
    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor('lineColor');
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', opacity);

    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', 0);
    }
    if (this._descriptor.properties.lineWidth && this._descriptor.properties.lineWidth.options) {
      const lineWidth = this._getMbSize('lineWidth');
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', lineWidth);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', 0);
    }
    if (this._descriptor.properties.iconSize && this._descriptor.properties.iconSize.options) {
      const iconSize = this._getMbSize('iconSize');
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', iconSize);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 0);
    }
  }
}
