/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from '../dynamic_style_property';
import { OrdinalLegend } from '../../components/legend/ordinal_legend';
import { MarkerSizeLegend } from '../../components/legend/marker_size_legend';
import { makeMbClampedNumberExpression } from '../../style_util';
import {
  FieldFormatter,
  HALF_MAKI_ICON_SIZE,
  MB_LOOKUP_FUNCTION,
  VECTOR_STYLES,
} from '../../../../../../common/constants';
import type { SizeDynamicOptions } from '../../../../../../common/descriptor_types';
import type { IField } from '../../../../fields/field';
import type { IVectorLayer } from '../../../../layers/vector_layer';

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
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', this.getMbSizeExpression());
  }

  syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-size', this.getMbSizeExpression());
  }

  syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', this.getMbSizeExpression());
  }

  syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', this.getMbSizeExpression());
  }

  syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'line-width', this.getMbSizeExpression());
  }

  syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(mbLayerId, 'text-size', this.getMbSizeExpression());
  }

  /*
   * Returns interpolation expression linearly translating domain values [minValue, maxValue] to display range [minSize, maxSize]
   */
  getMbSizeExpression(options?: {
    forceFeatureProperties?: boolean;
    maxStopOutput?: unknown;
    minStopOutput?: unknown;
  }) {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!this.isSizeDynamicConfigComplete() || !rangeFieldMeta) {
      // return min of size to avoid flashing
      // returning minimum allows "growing" of the symbols when the meta comes in
      // A grow effect us less visually jarring as shrinking.
      // especially relevant when displaying fine-grained grids using mvt
      return this._options.minSize >= 0 ? this._options.minSize : null;
    }

    const isArea = this.getStyleName() === VECTOR_STYLES.ICON_SIZE;
    // isArea === true
    // It's a mistake to linearly map a data value to an area dimension (i.e. cirle radius).
    // Area squares area dimension ("pie * r * r" or "x * x"), visually distorting proportions.
    // Since it is the quadratic function that is causing this,
    // we need to counteract its effects by applying its inverse function — the square-root function.
    // https://bl.ocks.org/guilhermesimoes/e6356aa90a16163a6f917f53600a2b4a

    // can not take square root of 0 or negative number
    // shift values to be positive integers >= 1
    const valueShift = rangeFieldMeta.min < 1 ? Math.abs(rangeFieldMeta.min) + 1 : 0;

    const maxStopInput = isArea ? Math.sqrt(rangeFieldMeta.max + valueShift) : rangeFieldMeta.max;
    const minStopInput = isArea ? Math.sqrt(rangeFieldMeta.min + valueShift) : rangeFieldMeta.min;

    const maxStopOutput = options?.maxStopOutput ? options.maxStopOutput : this.getMaxStopOutput();
    const minStopOutput = options?.minStopOutput ? options.minStopOutput : this.getMinStopOutput();
    const invert = this._options.invert === undefined ? false : this._options.invert;
    function getStopsWithoutRange() {
      return invert ? [maxStopInput, minStopOutput] : [maxStopInput, maxStopOutput];
    }
    function getStops() {
      return invert
        ? [minStopInput, maxStopOutput, maxStopInput, minStopOutput]
        : [minStopInput, minStopOutput, maxStopInput, maxStopOutput];
    }
    const stops = rangeFieldMeta.min === rangeFieldMeta.max ? getStopsWithoutRange() : getStops();

    const valueExpression = makeMbClampedNumberExpression({
      lookupFunction: options?.forceFeatureProperties
        ? MB_LOOKUP_FUNCTION.GET
        : this.getMbLookupFunction(),
      maxValue: rangeFieldMeta.max,
      minValue: rangeFieldMeta.min,
      fieldName: this.getMbFieldName(),
      fallback: invert ? rangeFieldMeta.max : rangeFieldMeta.min,
    });
    const valueShiftExpression =
      rangeFieldMeta.min < 1 ? ['+', valueExpression, valueShift] : valueExpression;
    const sqrtValueExpression = ['sqrt', valueShiftExpression];
    const inputExpression = isArea ? sqrtValueExpression : valueExpression;

    return ['interpolate', ['linear'], inputExpression, ...stops];
  }

  getMaxStopOutput() {
    return this.getStyleName() === VECTOR_STYLES.ICON_SIZE && this._isSymbolizedAsIcon
      ? this._options.maxSize / HALF_MAKI_ICON_SIZE
      : this._options.maxSize;
  }

  getMinStopOutput() {
    return this.getStyleName() === VECTOR_STYLES.ICON_SIZE && this._isSymbolizedAsIcon
      ? this._options.minSize / HALF_MAKI_ICON_SIZE
      : this._options.minSize;
  }

  isSizeDynamicConfigComplete() {
    return (
      this._field &&
      this._field.isValid() &&
      this._options.minSize >= 0 &&
      this._options.maxSize >= 0
    );
  }

  renderLegendDetailRow() {
    return this.getStyleName() === VECTOR_STYLES.ICON_SIZE && !this._isSymbolizedAsIcon ? (
      <MarkerSizeLegend style={this} />
    ) : (
      <OrdinalLegend style={this} />
    );
  }
}
