/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getColorRampStops } from './color_utils';
import { VectorStyleEditor } from './components/vector/vector_style_editor';
import { getDefaultProperties } from './vector_style_defaults';
import { AbstractStyle } from './abstract_style';
import { SOURCE_DATA_ID_ORIGIN, GEO_JSON_TYPE } from '../../../../common/constants';
import { VectorIcon } from './components/vector/legend/vector_icon';
import { VectorStyleLegend } from './components/vector/legend/vector_style_legend';
import { VECTOR_SHAPE_TYPES } from '../sources/vector_feature_types';
import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from './vector_constants';
import {
  getMakiSymbolAnchor,
  LARGE_MAKI_ICON_SIZE,
  SMALL_MAKI_ICON_SIZE,
  HALF_LARGE_MAKI_ICON_SIZE
} from './symbol_utils';

export class VectorStyle extends AbstractStyle {

  static type = 'VECTOR';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  static getComputedFieldName(fieldName) {
    return `__kbn__scaled(${fieldName})`;
  }

  constructor(descriptor = {}, source) {
    super();
    this._source = source;
    this._descriptor = {
      ...descriptor,
      ...VectorStyle.createDescriptor(descriptor.properties),
    };
  }

  static createDescriptor(properties = {}) {
    return {
      type: VectorStyle.type,
      properties: { ...getDefaultProperties(), ...properties }
    };
  }

  static createDefaultStyleProperties(mapColors) {
    return getDefaultProperties(mapColors);
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
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
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

  async pluckStyleMetaFromSourceDataRequest(sourceDataRequest) {
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

    const supportedFeatures = await this._source.getSupportedShapeTypes();
    const isSingleFeatureType = supportedFeatures.length === 1;

    if (scaledFields.length === 0 && isSingleFeatureType) {
      // no meta data to pull from source data request.
      return {};
    }

    let hasPoints = false;
    let hasLines = false;
    let hasPolygons = false;
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!hasPoints && [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT].includes(feature.geometry.type)) {
        hasPoints = true;
      }
      if (!hasLines && [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING].includes(feature.geometry.type)) {
        hasLines = true;
      }
      if (!hasPolygons && [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON].includes(feature.geometry.type)) {
        hasPolygons = true;
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
      hasFeatureType: {
        [VECTOR_SHAPE_TYPES.POINT]: hasPoints,
        [VECTOR_SHAPE_TYPES.LINE]: hasLines,
        [VECTOR_SHAPE_TYPES.POLYGON]: hasPolygons
      }
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

  _checkIfOnlyFeatureType = async (featureType) => {
    const supportedFeatures = await this._source.getSupportedShapeTypes();

    if (supportedFeatures.length === 1) {
      return supportedFeatures[0] === featureType;
    }

    if (!this._descriptor.__styleMeta || !this._descriptor.__styleMeta.hasFeatureType) {
      return false;
    }

    const featureTypes = Object.keys(this._descriptor.__styleMeta.hasFeatureType);
    return featureTypes.reduce((isOnlySingleFeatureType, featureTypeKey) => {
      const hasFeature = this._descriptor.__styleMeta.hasFeatureType[featureTypeKey];
      return featureTypeKey === featureType
        ? isOnlySingleFeatureType && hasFeature
        : isOnlySingleFeatureType && !hasFeature;
    }, true);
  }

  _getIsPointsOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.POINT);
  }

  _getIsLinesOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.LINE);
  }

  _getIsPolygonsOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.POLYGON);
  }

  _getFieldRange = (fieldName) => {
    return _.get(this._descriptor, ['__styleMeta', fieldName]);
  }

  getIcon = () => {
    const styles = this.getProperties();
    const symbolId = this.arePointsSymbolizedAsCircles()
      ? undefined
      : this._descriptor.properties.symbol.options.symbolId;
    return (
      <VectorIcon
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
        fillColor={styles.fillColor}
        lineColor={styles.lineColor}
        symbolId={symbolId}
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

  _getScaledFields() {
    return this.getDynamicPropertiesArray()
      .map(({ styleName, options }) => {
        const name = options.field.name;

        // "feature-state" data expressions are not supported with layout properties.
        // To work around this limitation, some scaled values must fall back to geojson property values.
        let supportsFeatureState = true;
        if (styleName === 'iconSize'
          && this._descriptor.properties.symbol.options.symbolizeAs === SYMBOLIZE_AS_ICON) {
          supportsFeatureState = false;
        }

        return {
          supportsFeatureState,
          name,
          range: this._getFieldRange(name),
          computedName: VectorStyle.getComputedFieldName(name),
        };
      });
  }

  clearFeatureState(featureCollection, mbMap, sourceId) {
    const tmpFeatureIdentifier = {
      source: null,
      id: null
    };
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.removeFeatureState(tmpFeatureIdentifier);
    }
  }

  setFeatureState(featureCollection, mbMap, sourceId) {

    if (!featureCollection) {
      return;
    }

    const scaledFields  = this._getScaledFields();
    if (scaledFields.length === 0) {
      return;
    }

    const tmpFeatureIdentifier = {
      source: null,
      id: null
    };
    const tmpFeatureState = {};

    //scale to [0,1] domain
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];

      for (let j = 0; j < scaledFields.length; j++) {
        const { supportsFeatureState, name, range, computedName } = scaledFields[j];
        const unscaledValue = parseFloat(feature.properties[name]);
        let scaledValue;
        if (isNaN(unscaledValue) || !range) {//cannot scale
          scaledValue = -1;//put outside range
        } else if (range.delta === 0) {//values are identical
          scaledValue = 1;//snap to end of color range
        } else {
          scaledValue = (feature.properties[name] - range.min) / range.delta;
        }
        if (supportsFeatureState) {
          tmpFeatureState[computedName] = scaledValue;
        } else {
          feature.properties[computedName] = scaledValue;
        }
      }
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.setFeatureState(tmpFeatureIdentifier, tmpFeatureState);
    }

    const hasScaledGeoJsonProperties = scaledFields.some(({ supportsFeatureState }) => {
      return !supportsFeatureState;
    });
    return hasScaledGeoJsonProperties;
  }

  _getMBDataDrivenColor({ fieldName, color }) {
    const colorStops = getColorRampStops(color);
    const targetName = VectorStyle.getComputedFieldName(fieldName);
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', targetName], -1],
      -1, 'rgba(0,0,0,0)',
      ...colorStops
    ];
  }

  _getMbDataDrivenSize({ fieldName, minSize, maxSize }) {
    const targetName = VectorStyle.getComputedFieldName(fieldName);
    return   [
      'interpolate',
      ['linear'],
      ['feature-state', targetName],
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

  _isSizeDynamicConfigComplete(styleDescriptor) {
    return _.has(styleDescriptor, 'options.field.name')
      && _.has(styleDescriptor, 'options.minSize')
      && _.has(styleDescriptor, 'options.maxSize');
  }

  _getMbSize(styleDescriptor) {
    if (styleDescriptor.type === VectorStyle.STYLE_TYPE.STATIC) {
      return styleDescriptor.options.size;
    }

    if (this._isSizeDynamicConfigComplete(styleDescriptor)) {
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

  async setMBSymbolPropertiesForPoints({ mbMap, symbolLayerId, alpha }) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-ignore-placement', true);

    const symbolId = this._descriptor.properties.symbol.options.symbolId;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
    const color = this._getMBColor(this._descriptor.properties.fillColor);
    // icon-color is only supported on SDF icons.
    mbMap.setPaintProperty(symbolLayerId, 'icon-color', color);
    mbMap.setPaintProperty(symbolLayerId, 'icon-opacity', alpha);

    // circle sizing is by radius
    // to make icons be similiar in size to circles then have to deal with icon in half width measurements
    const iconSize = this._descriptor.properties.iconSize;
    if (iconSize.type === VectorStyle.STYLE_TYPE.STATIC) {
      const iconPixels = iconSize.options.size >= HALF_LARGE_MAKI_ICON_SIZE
        ? LARGE_MAKI_ICON_SIZE
        : SMALL_MAKI_ICON_SIZE;
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', `${symbolId}-${iconPixels}`);

      const halfIconPixels = iconPixels / 2;
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', iconSize.options.size / halfIconPixels);
    } else if (this._isSizeDynamicConfigComplete(iconSize)) {
      const iconPixels = iconSize.options.maxSize >= HALF_LARGE_MAKI_ICON_SIZE
        ? LARGE_MAKI_ICON_SIZE
        : SMALL_MAKI_ICON_SIZE;
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', `${symbolId}-${iconPixels}`);

      const halfIconPixels = iconPixels / 2;
      const targetName = VectorStyle.getComputedFieldName(iconSize.options.field.name);
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', [
        'interpolate',
        ['linear'],
        ['get', targetName],
        0, iconSize.options.minSize / halfIconPixels,
        1, iconSize.options.maxSize / halfIconPixels
      ]);
    }
  }

  arePointsSymbolizedAsCircles() {
    return this._descriptor.properties.symbol.options.symbolizeAs === SYMBOLIZE_AS_CIRCLE;
  }
}
