/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Map as MbMap } from 'mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { OrdinalLegend } from '../components/legend/ordinal_legend';
import { makeMbClampedNumberExpression } from '../style_util';
import {
  HALF_LARGE_MAKI_ICON_SIZE,
  LARGE_MAKI_ICON_SIZE,
  SMALL_MAKI_ICON_SIZE,
  // @ts-expect-error
} from '../symbol_utils';
import { FieldFormatter, MB_LOOKUP_FUNCTION, VECTOR_STYLES } from '../../../../../common/constants';
import { SizeDynamicOptions } from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer/vector_layer';

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

  supportsMbFeatureState() {
    // mb style "icon-size" does not support feature state
    if (this.getStyleName() === VECTOR_STYLES.ICON_SIZE && this._isSymbolizedAsIcon) {
      return false;
    }

    // mb style "text-size" does not support feature state
    if (this.getStyleName() === VECTOR_STYLES.LABEL_SIZE) {
      return false;
    }

    return super.supportsMbFeatureState();
  }

  syncHaloWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const haloWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }

  getIconPixelSize() {
    return this._options.maxSize >= HALF_LARGE_MAKI_ICON_SIZE
      ? LARGE_MAKI_ICON_SIZE
      : SMALL_MAKI_ICON_SIZE;
  }

  syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap) {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (this._isSizeDynamicConfigComplete() && rangeFieldMeta) {
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

  syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
  }

  syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap) {
    const circleRadius = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', circleRadius);
  }

  syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setPaintProperty(mbLayerId, 'line-width', lineWidth);
  }

  syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap) {
    const lineWidth = this.getMbSizeExpression();
    mbMap.setLayoutProperty(mbLayerId, 'text-size', lineWidth);
  }

  getMbSizeExpression() {
    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!this._isSizeDynamicConfigComplete() || !rangeFieldMeta) {
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

  _getMbDataDrivenSize({
    targetName,
    minSize,
    maxSize,
    minValue,
    maxValue,
  }: {
    targetName: string;
    minSize: number;
    maxSize: number;
    minValue: number;
    maxValue: number;
  }) {
    const stops =
      minValue === maxValue ? [maxValue, maxSize] : [minValue, minSize, maxValue, maxSize];
    return [
      'interpolate',
      ['linear'],
      makeMbClampedNumberExpression({
        lookupFunction: this.getMbLookupFunction(),
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
