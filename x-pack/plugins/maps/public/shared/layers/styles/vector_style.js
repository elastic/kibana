/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FillableCircle, FillableVector } from '../../icons/additional_layer_icons';
import { ColorGradient } from '../../icons/color_gradient';
import { getHexColorRangeStrings } from '../../utils/color_utils';
import { VectorStyleEditor } from './components/vector/vector_style_editor';
import { getDefaultStaticProperties } from './vector_style_defaults';
import { AbstractStyle } from './abstract_style';
import { SOURCE_DATA_ID_ORIGIN } from '../../../../common/constants';

export class VectorStyle extends AbstractStyle {

  static type = 'VECTOR';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  static getComputedFieldName(fieldName) {
    return `__kbn__scaled(${fieldName})`;
  }

  constructor(descriptor = {}) {
    super();
    this._descriptor = VectorStyle.createDescriptor(descriptor.properties);
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptor(properties = {}) {
    return {
      type: VectorStyle.type,
      properties: { ...getDefaultStaticProperties(), ...properties }
    };
  }

  static createDefaultStyleProperties(mapColors) {
    return getDefaultStaticProperties(mapColors);
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.vector.displayNameLabel', {
      defaultMessage: 'Vector style'
    });
  }

  static description = '';

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

  /*
   * Changes to source descriptor and join descriptor will impact style properties.
   * For instance, a style property may be dynamically tied to the value of an ordinal field defined
   * by a join or a metric aggregation. The metric aggregation or join may be edited or removed.
   * When this happens, the style will be linked to a no-longer-existing ordinal field.
   * This method provides a way for a style to clean itself and return a descriptor that unsets any dynamic
   * properties that are tied to missing oridinal fields
   *
   * This method does not update its descriptor. It just returns a new descriptor that the caller
   * can then use to update store state via dispatch.
   */
  getDescriptorWithMissingStylePropsRemoved(nextOrdinalFields) {
    const originalProperties = this.getProperties();
    const updatedProperties = {};
    Object.keys(originalProperties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const fieldName = _.get(originalProperties[propertyName], 'options.field.name');
      if (!fieldName) {
        return;
      }

      const matchingOrdinalField = nextOrdinalFields.find(oridinalField => {
        return fieldName === oridinalField.name;
      });

      if (matchingOrdinalField) {
        return;
      }

      updatedProperties[propertyName] = {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          ...originalProperties[propertyName].options
        }
      };
      delete updatedProperties[propertyName].options.field;
    });

    if (Object.keys(updatedProperties).length === 0) {
      return {
        hasChanges: false,
        nextStyleDescriptor: { ...this._descriptor },
      };
    }

    return {
      hasChanges: true,
      nextStyleDescriptor: VectorStyle.createDescriptor({
        ...originalProperties,
        ...updatedProperties,
      })
    };
  }

  getSourceFieldNames() {
    const properties = this.getProperties();
    const fieldNames = [];
    Object.keys(properties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const field = _.get(properties[propertyName], 'options.field', {});
      if (field.origin === SOURCE_DATA_ID_ORIGIN && field.name) {
        fieldNames.push(field.name);
      }
    });

    return fieldNames;
  }

  getProperties() {
    return this._descriptor.properties || {};
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
    const diff = max - min;
    const propName = VectorStyle.getComputedFieldName(fieldName);

    //scale to [0,1] domain
    for (let i = 0; i < features.length; i++) {
      const unscaledValue = parseFloat(features[i].properties[fieldName]);
      let scaledValue;
      if (isNaN(unscaledValue)) {//cannot scale
        scaledValue = -1;//put outside range
      } else if (diff === 0) {//values are identical
        scaledValue = 1;//snap to end of color range
      } else {
        scaledValue = (features[i].properties[fieldName] - min) / diff;
      }
      features[i].properties[propName] =  scaledValue;
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

  _getMBDataDrivenColor({ fieldName, color }) {
    const colorRange = getHexColorRangeStrings(color, 8)
      .reduce((accu, curColor, idx, srcArr) => {
        accu = [ ...accu, idx / srcArr.length, curColor ];
        return accu;
      }, []);
    const targetName = VectorStyle.getComputedFieldName(fieldName);
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', targetName], -1],
      -1, 'rgba(0,0,0,0)',
      ...colorRange
    ];
  }

  _getMbDataDrivenSize({ fieldName, minSize, maxSize }) {
    const targetName = VectorStyle.getComputedFieldName(fieldName);
    return   ['interpolate',
      ['linear'],
      ['get', targetName],
      0, minSize,
      1, maxSize
    ];
  }

  _getMBColor(styleDescriptor) {
    const isStatic = styleDescriptor.type === VectorStyle.STYLE_TYPE.STATIC;
    if (isStatic) {
      return _.get(styleDescriptor, 'options.color', null);
    }

    const isDynamicConfigComplete = _.has(styleDescriptor, 'options.field.name')
      && _.has(styleDescriptor, 'options.color');
    if (isDynamicConfigComplete) {
      return this._getMBDataDrivenColor({
        fieldName: styleDescriptor.options.field.name,
        color: styleDescriptor.options.color,
      });
    }

    return null;
  }

  _getMbSize(styleDescriptor) {
    if (styleDescriptor.type === VectorStyle.STYLE_TYPE.STATIC) {
      return styleDescriptor.options.size;
    }

    const isDynamicConfigComplete = _.has(styleDescriptor, 'options.field.name')
      && _.has(styleDescriptor, 'options.minSize')
      && _.has(styleDescriptor, 'options.maxSize');
    if (isDynamicConfigComplete) {
      return this._getMbDataDrivenSize({
        fieldName: styleDescriptor.options.field.name,
        minSize: styleDescriptor.options.minSize,
        maxSize: styleDescriptor.options.maxSize,
      });
    }

    return null;
  }

  setMBPaintProperties({ alpha, mbMap, fillLayerId, lineLayerId }) {
    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor(this._descriptor.properties.fillColor);
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', alpha);
    } else {
      mbMap.setPaintProperty(fillLayerId, 'fill-color', null);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', 0);
    }

    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor(this._descriptor.properties.lineColor);
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', alpha);

    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-color', null);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', 0);
    }

    if (this._descriptor.properties.lineWidth) {
      const lineWidth = this._getMbSize(this._descriptor.properties.lineWidth);
      mbMap.setPaintProperty(lineLayerId, 'line-width', lineWidth);
    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-width', 0);
    }
  }

  setMBPaintPropertiesForPoints({ alpha, mbMap, pointLayerId }) {
    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor(this._descriptor.properties.fillColor);
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', alpha);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', 0);
    }
    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor(this._descriptor.properties.lineColor);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);

    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', 0);
    }
    if (this._descriptor.properties.lineWidth) {
      const lineWidth = this._getMbSize(this._descriptor.properties.lineWidth);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', lineWidth);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', 0);
    }
    if (this._descriptor.properties.iconSize) {
      const iconSize = this._getMbSize(this._descriptor.properties.iconSize);
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', iconSize);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 0);
    }
  }
}
