/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { OrdinalLegend } from '../components/legend/ordinal_legend';
import { makeMbClampedNumberExpression } from '../style_util';
import {
  FieldFormatter,
  HALF_MAKI_ICON_SIZE,
  MB_LOOKUP_FUNCTION,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { SizeDynamicOptions } from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer';

export class DynamicSizeProperty extends DynamicStyleProperty<SizeDynamicOptions> {
  private readonly _isSymbolizedAsIcon: boolean;

  constructor(
    options: SizeDynamicOptions,
    styleName: VECTOR_STYLES,
    field: IField | null,
    vectorLayer: IVectorLayer,
    getFieldFormatter: (fieldName: string) => null | FieldFormatter,
    isSymbolizedAsIcon: boolean
  ) {
    super(options, styleName, field, vectorLayer, getFieldFormatter);
    this._isSymbolizedAsIcon = isSymbolizedAsIcon;
  }

  supportsFeatureState() {
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

  syncHaloWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const haloWidth = this.getMbSizeExpression(false);
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }

  syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap) {
    const iconSizeExpression = this.getMbSizeExpression(
      true,
      function(rangeValue) {
        return rangeValue / HALF_MAKI_ICON_SIZE
      }
    );
    mbMap.setLayoutProperty(symbolLayerId, 'icon-size', iconSizeExpression);
  }

  syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression(false);
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
  }

  syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap) {
    const circleRadius = this.getMbSizeExpression(true);
    console.log(JSON.stringify(circleRadius, null, 2));
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', circleRadius);
  }

  syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression(false);
    mbMap.setPaintProperty(mbLayerId, 'line-width', lineWidth);
  }

  syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression(false);
    mbMap.setLayoutProperty(mbLayerId, 'text-size', lineWidth);
  }

  /*
   * Returns interpolation expression linearly translating domain values [minValue, maxValue] to display range [minSize, maxSize]
   * @param {boolean} isArea When true, translate square root of domain value to display range.
   * @param {undefined | function} scaleRange
   */
  getMbSizeExpression(isArea: boolean, scaleRange?: (rangeValue: number) => number) {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!this._isSizeDynamicConfigComplete() || !rangeFieldMeta) {
      // return min of size to avoid flashing
      // returning minimum allows "growing" of the symbols when the meta comes in
      // A grow effect us less visually jarring as shrinking.
      // especially relevant when displaying fine-grained grids using mvt
      return this._options.minSize >= 0 ? this._options.minSize : null;
    }

    // isArea === true
    // It's a mistake to linearly map a data value to an area dimension (i.e. cirle radius).
    // Area squares area dimension ("pie * r * r" or "x * x"), visually distorting proportions.
    // Since it is the quadratic function that is causing this, 
    // we need to counteract its effects by applying its inverse function — the square-root function. 
    // https://bl.ocks.org/guilhermesimoes/e6356aa90a16163a6f917f53600a2b4a

    // can not take square root of 0 or negative number
    // shift values to be positive integers >= 1
    const valueShift = rangeFieldMeta.min < 1
      ? Math.abs(rangeFieldMeta.min) + 1
      : 0;

    const maxValueStopInput = isArea ? Math.sqrt(rangeFieldMeta.max + valueShift) : rangeFieldMeta.max;
    const minValueStopInput = isArea ? Math.sqrt(rangeFieldMeta.min + valueShift) : rangeFieldMeta.min;
    const maxRangeStopOutput = scaleRange ? scaleRange(this._options.maxSize) : this._options.maxSize;
    const minRangeStopOutput = scaleRange ? scaleRange(this._options.minSize) : this._options.minSize;
    const stops =
      rangeFieldMeta.min === rangeFieldMeta.max 
        ? [maxValueStopInput, maxRangeStopOutput] 
        : [minValueStopInput, minRangeStopOutput, maxValueStopInput, maxRangeStopOutput];

    const valueExpression = makeMbClampedNumberExpression({
      lookupFunction: this.getMbLookupFunction(),
      maxValue: rangeFieldMeta.max,
      minValue: rangeFieldMeta.min,
      fieldName: this.getMbFieldName(),
      fallback: rangeFieldMeta.min,
    });
    const valueShiftExpression = rangeFieldMeta.min < 1
      ? ['+', valueExpression, valueShift]
      : valueExpression;
    const sqrtValueExpression = ['sqrt', valueShiftExpression];
    const inputExpression = isArea ? sqrtValueExpression : valueExpression;

    return [
      'interpolate',
      ['linear'],
      inputExpression,
      ...stops,
    ];
  }

  _isSizeDynamicConfigComplete() {
    return (
      this._field &&
      this._field.isValid() &&
      this._options.minSize >= 0 &&
      this._options.maxSize >= 0
    );
  }

  renderLegendDetailRow() {
    return <OrdinalLegend style={this} />;
  }
}
