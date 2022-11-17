/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import { LABEL_POSITIONS } from '../../../../../common/constants';
import { LabelPositionStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';
import { DEFAULT_ICON_SIZE, DEFAULT_LABEL_SIZE } from '../vector_style_defaults';
import { StaticSizeProperty } from './static_size_property';
import { DynamicSizeProperty } from './dynamic_size_property';

export class LabelPositionProperty extends AbstractStyleProperty<
  LabelPositionStylePropertyDescriptor['options']
> {
  private readonly _iconSizeProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _labelSizeProperty: StaticSizeProperty | DynamicSizeProperty;

  constructor(
    options: LabelPositionStylePropertyDescriptor['options'],
    styleName: VECTOR_STYLES,
    iconSizeProperty: StaticSizeProperty | DynamicSizeProperty,
    labelSizeProperty: StaticSizeProperty | DynamicSizeProperty
  ) {
    super(options, styleName);
    this._iconSizeProperty = iconSizeProperty;
    this._labelSizeProperty = labelSizeProperty;
  }

  syncLabelPositionWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this._options.position === LABEL_POSITIONS.CENTER) {
      mbMap.setLayoutProperty(mbLayerId, 'text-offset', [0, 0]);
      mbMap.setLayoutProperty(mbLayerId, 'text-anchor', 'center');
      return;
    }

    mbMap.setLayoutProperty(
      mbLayerId,
      'text-anchor',
      this._options.position === LABEL_POSITIONS.BOTTOM ? 'top' : 'bottom'
    );

    const labelSize = this._getLabelSize();

    if (
      this._iconSizeProperty.isDynamic() &&
      this._iconSizeProperty.isComplete() &&
      (this._iconSizeProperty as DynamicSizeProperty).isSizeDynamicConfigComplete()
    ) {
      const dynamicIconSizeOptions = (this._iconSizeProperty as DynamicSizeProperty).getOptions();
      const interpolateExpression = (
        this._iconSizeProperty as DynamicSizeProperty
      ).getMbSizeExpression();
      interpolateExpression[4] = [
        'literal',
        this._getTextOffset(dynamicIconSizeOptions.minSize, labelSize),
      ];
      interpolateExpression[6] = [
        'literal',
        this._getTextOffset(dynamicIconSizeOptions.maxSize, labelSize),
      ];
      mbMap.setLayoutProperty(mbLayerId, 'text-offset', interpolateExpression);
      return;
    }

    const iconSize = !this._iconSizeProperty.isDynamic()
      ? (this._iconSizeProperty as StaticSizeProperty).getOptions().size
      : DEFAULT_ICON_SIZE;
    mbMap.setLayoutProperty(mbLayerId, 'text-offset', this._getTextOffset(iconSize, labelSize));
  }

  // https://maplibre.org/maplibre-gl-js-docs/style-spec/layers/#layout-symbol-text-offset
  _getTextOffset(symbolSize: number, labelSize: number) {
    const ems = symbolSize / labelSize;
    // Positive values indicate right and down, while negative values indicate left and up
    const verticalTextOffset = this._options.position === LABEL_POSITIONS.BOTTOM ? ems : ems * -1;
    return [0, verticalTextOffset];
  }

  _getLabelSize() {
    if (
      this._labelSizeProperty.isDynamic() &&
      this._labelSizeProperty.isComplete() &&
      (this._labelSizeProperty as DynamicSizeProperty).isSizeDynamicConfigComplete()
    ) {
      const dynamicSizeOptions = (this._labelSizeProperty as DynamicSizeProperty).getOptions();
      return (dynamicSizeOptions.maxSize - dynamicSizeOptions.minSize) / 2;
    }

    return !this._labelSizeProperty.isDynamic()
      ? (this._labelSizeProperty as StaticSizeProperty).getOptions().size
      : DEFAULT_LABEL_SIZE;
  }
}
