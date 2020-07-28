/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { OrdinalLegend } from '../components/legend/ordinal_legend';
import { makeMbClampedNumberExpression } from '../style_util';
import {
  HALF_LARGE_MAKI_ICON_SIZE,
  LARGE_MAKI_ICON_SIZE,
  SMALL_MAKI_ICON_SIZE,
} from '../symbol_utils';
import { MB_LOOKUP_FUNCTION, VECTOR_STYLES } from '../../../../../common/constants';
import _ from 'lodash';
import React from 'react';

export class DynamicSizeProperty extends DynamicStyleProperty {
  constructor(options, styleName, field, vectorLayer, getFieldFormatter, isSymbolizedAsIcon) {
    super(options, styleName, field, vectorLayer, getFieldFormatter);
    this._isSymbolizedAsIcon = isSymbolizedAsIcon;
  }

  supportsMbFeatureState() {
    // mb style "icon-size" does not support feature state
    if (this.getStyleName() === VECTOR_STYLES.ICON_SIZE && this._isSymbolizedAsIcon) {
      return false;
    }

    // mb style "text-size" does not support feature state
    if (this.getStyleName() === VECTOR_STYLES.LABEL_SIZE) {
      return false;
    }

    return true;
  }

  syncHaloWidthWithMb(mbLayerId, mbMap) {
    const haloWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }

  getIconPixelSize() {
    return this._options.maxSize >= HALF_LARGE_MAKI_ICON_SIZE
      ? LARGE_MAKI_ICON_SIZE
      : SMALL_MAKI_ICON_SIZE;
  }

  syncIconSizeWithMb(symbolLayerId, mbMap) {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (this._isSizeDynamicConfigComplete(this._options) && rangeFieldMeta) {
      const halfIconPixels = this.getIconPixelSize() / 2;
      const targetName = this.getFieldName();
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', [
        'interpolate',
        ['linear'],
        makeMbClampedNumberExpression({
          minValue: rangeFieldMeta.min,
          maxValue: rangeFieldMeta.max,
          fallback: 0,
          lookupFunction: MB_LOOKUP_FUNCTION.GET,
          fieldName: targetName,
        }),
        rangeFieldMeta.min,
        this._options.minSize / halfIconPixels,
        rangeFieldMeta.max,
        this._options.maxSize / halfIconPixels,
      ]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', null);
    }
  }

  syncCircleStrokeWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
  }

  syncCircleRadiusWithMb(mbLayerId, mbMap) {
    const circleRadius = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', circleRadius);
  }

  syncLineWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'line-width', lineWidth);
  }

  syncLabelSizeWithMb(mbLayerId, mbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setLayoutProperty(mbLayerId, 'text-size', lineWidth);
  }

  getMbSizeExpression() {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!this._isSizeDynamicConfigComplete(this._options) || !rangeFieldMeta) {
      return null;
    }

    return this._getMbDataDrivenSize({
      targetName: this.getFieldName(),
      minSize: this._options.minSize,
      maxSize: this._options.maxSize,
      minValue: rangeFieldMeta.min,
      maxValue: rangeFieldMeta.max,
    });
  }

  _getMbDataDrivenSize({ targetName, minSize, maxSize, minValue, maxValue }) {
    const lookup = this.supportsMbFeatureState()
      ? MB_LOOKUP_FUNCTION.FEATURE_STATE
      : MB_LOOKUP_FUNCTION.GET;

    const stops =
      minValue === maxValue ? [maxValue, maxSize] : [minValue, minSize, maxValue, maxSize];
    return [
      'interpolate',
      ['linear'],
      makeMbClampedNumberExpression({
        lookupFunction: lookup,
        maxValue,
        minValue,
        fieldName: targetName,
        fallback: 0,
      }),
      ...stops,
    ];
  }

  _isSizeDynamicConfigComplete() {
    return (
      this._field &&
      this._field.isValid() &&
      _.has(this._options, 'minSize') &&
      _.has(this._options, 'maxSize')
    );
  }

  renderLegendDetailRow() {
    return <OrdinalLegend style={this} />;
  }
}
