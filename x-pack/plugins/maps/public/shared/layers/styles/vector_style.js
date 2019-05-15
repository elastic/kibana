/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getHexColorRangeStrings } from '../../utils/color_utils';
import { VectorStyleEditor } from './components/vector/vector_style_editor';
import { getDefaultStaticProperties } from './vector_style_defaults';
import { AbstractStyle } from './abstract_style';
import { SOURCE_DATA_ID_ORIGIN } from '../../../../common/constants';
import { VectorIcon } from './components/vector/legend/vector_icon';
import { VectorStyleLegend } from './components/vector/legend/vector_style_legend';

export class VectorStyle extends AbstractStyle {

  static type = 'VECTOR';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  static getComputedFieldName(fieldName) {
    return `__kbn__scaled(${fieldName})`;
  }

  constructor(descriptor = {}) {
    super();
    this._descriptor = {
      ...descriptor,
      ...VectorStyle.createDescriptor(descriptor.properties),
    };
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

  renderEditor({ layer, onStyleDescriptorChange }) {
    const styleProperties = { ...this.getProperties() };
    const handlePropertyChange = (propertyName, settings) => {
      styleProperties[propertyName] = settings;//override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(styleProperties);
      onStyleDescriptorChange(vectorStyleDescriptor);
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

  pluckStyleMetaFromSourceDataRequest(sourceDataRequest) {
    const features = _.get(sourceDataRequest.getData(), 'features', []);
    if (features.length === 0) {
      return {};
    }

    const scaledFields = this.getDynamicPropertiesArray()
      .map(({ options }) => {
        return {
          name: options.field.name,
          min: Infinity,
          max: -Infinity
        };
      });

    let isPointsOnly = true;
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (isPointsOnly && feature.geometry.type !== 'Point') {
        isPointsOnly = false;
      }
      for (let j = 0; j < scaledFields.length; j++) {
        const scaledField = scaledFields[j];
        const newValue = parseFloat(feature.properties[scaledField.name]);
        if (!isNaN(newValue)) {
          scaledField.min = Math.min(scaledField.min, newValue);
          scaledField.max = Math.max(scaledField.max, newValue);
        }
      }
    }

    const featuresMeta = {
      isPointsOnly
    };

    scaledFields.forEach(({ min, max, name }) => {
      if (min !== Infinity && max !== -Infinity) {
        featuresMeta[name] = {
          min,
          max,
          delta: max - min,
        };
      }
    });

    return featuresMeta;
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

  getDynamicPropertiesArray() {
    const styles = this.getProperties();
    return Object.keys(styles)
      .map(styleName => {
        const { type, options } = styles[styleName];
        return {
          styleName,
          type,
          options
        };
      })
      .filter(({ styleName }) => {
        return this._isPropertyDynamic(styleName);
      });
  }

  _isPropertyDynamic(propertyName) {
    const { type, options } = _.get(this._descriptor, ['properties', propertyName], {});
    return type === VectorStyle.STYLE_TYPE.DYNAMIC && options.field && options.field.name;
  }

  _getIsPointsOnly = () => {
    return _.get(this._descriptor, '__styleMeta.isPointsOnly', false);
  }

  _getFieldRange = (fieldName) => {
    return _.get(this._descriptor, ['__styleMeta', fieldName]);
  }

  getIcon = () => {
    const styles = this.getProperties();
    return (
      <VectorIcon
        isPointsOnly={this._getIsPointsOnly()}
        fillColor={styles.fillColor}
        lineColor={styles.lineColor}
      />
    );
  }

  getLegendDetails() {
    const styles = this.getProperties();
    const styleProperties = Object.keys(styles).map(styleName => {
      const { type, options } = styles[styleName];
      return {
        name: styleName,
        type,
        options,
        range: options && options.field && options.field.name ? this._getFieldRange(options.field.name) : null,
      };
    });

    return (<VectorStyleLegend styleProperties={styleProperties}/>);
  }

  addScaledPropertiesBasedOnStyle(featureCollection) {
    if (!featureCollection || featureCollection.length === 0) {
      return false;
    }

    const scaledFields = this.getDynamicPropertiesArray()
      .map(({ options }) => {
        const name = options.field.name;
        return {
          name,
          range: this._getFieldRange(name),
          computedName: VectorStyle.getComputedFieldName(name),
        };
      })
      .filter(({ range }) => {
        return range;
      });

    if (scaledFields.length === 0) {
      return false;
    }

    //scale to [0,1] domain
    featureCollection.features.forEach(feature => {
      scaledFields.forEach(({ name, range, computedName }) => {
        const unscaledValue = parseFloat(feature.properties[name]);
        let scaledValue;
        if (isNaN(unscaledValue)) {//cannot scale
          scaledValue = -1;//put outside range
        } else if (range.delta === 0) {//values are identical
          scaledValue = 1;//snap to end of color range
        } else {
          scaledValue = (feature.properties[name] - range.min) / range.delta;
        }
        feature.properties[computedName] = scaledValue;
      });
    });

    return true;
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
