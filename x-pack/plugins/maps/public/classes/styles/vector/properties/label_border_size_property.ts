/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Map as MbMap } from 'mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import { DEFAULT_LABEL_SIZE } from '../vector_style_defaults';
import { LABEL_BORDER_SIZES } from '../../../../../common/constants';
import { LabelBorderSizeOptions } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';
import { StaticSizeProperty } from './static_size_property';
import { DynamicSizeProperty } from './dynamic_size_property';

const SMALL_SIZE = 1 / 16;
const MEDIUM_SIZE = 1 / 8;
const LARGE_SIZE = 1 / 5; // halo of 1/4 is just a square. Use smaller ratio to preserve contour on letters

function getWidthRatio(size: LABEL_BORDER_SIZES) {
  switch (size) {
    case LABEL_BORDER_SIZES.LARGE:
      return LARGE_SIZE;
    case LABEL_BORDER_SIZES.MEDIUM:
      return MEDIUM_SIZE;
    default:
      return SMALL_SIZE;
  }
}

export class LabelBorderSizeProperty extends AbstractStyleProperty<LabelBorderSizeOptions> {
  private readonly _labelSizeProperty: StaticSizeProperty | DynamicSizeProperty;

  constructor(
    options: LabelBorderSizeOptions,
    styleName: VECTOR_STYLES,
    labelSizeProperty: StaticSizeProperty | DynamicSizeProperty
  ) {
    super(options, styleName);
    this._labelSizeProperty = labelSizeProperty;
  }

  syncLabelBorderSizeWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this.getOptions().size === LABEL_BORDER_SIZES.NONE) {
      mbMap.setPaintProperty(mbLayerId, 'text-halo-width', 0);
      return;
    }

    const widthRatio = getWidthRatio(this.getOptions().size);

    if (this._labelSizeProperty.isDynamic() && this._labelSizeProperty.isComplete()) {
      const labelSizeExpression = (this
        ._labelSizeProperty as DynamicSizeProperty).getMbSizeExpression();
      if (labelSizeExpression) {
        mbMap.setPaintProperty(mbLayerId, 'text-halo-width', [
          'max',
          ['*', labelSizeExpression, widthRatio],
          1,
        ]);
        return;
      }
    }

    const labelSize = _.get(this._labelSizeProperty.getOptions(), 'size', DEFAULT_LABEL_SIZE);
    const labelBorderSize = Math.max(labelSize * widthRatio, 1);
    mbMap.setPaintProperty(mbLayerId, 'text-halo-width', labelBorderSize);
  }
}
