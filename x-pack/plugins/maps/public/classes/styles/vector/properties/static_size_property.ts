/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import { VECTOR_STYLES } from '../../../../../common/constants';
import {
  HALF_LARGE_MAKI_ICON_SIZE,
  LARGE_MAKI_ICON_SIZE,
  SMALL_MAKI_ICON_SIZE,
  // @ts-expect-error
} from '../symbol_utils';
import { SizeStaticOptions } from '../../../../../common/descriptor_types';

export class StaticSizeProperty extends StaticStyleProperty<SizeStaticOptions> {
  constructor(options: SizeStaticOptions, styleName: VECTOR_STYLES) {
    if (typeof options.size !== 'number') {
      super({ size: 1 }, styleName);
    } else {
      super(options, styleName);
    }
  }

  syncHaloWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', this._options.size);
  }

  getIconPixelSize() {
    return this._options.size >= HALF_LARGE_MAKI_ICON_SIZE
      ? LARGE_MAKI_ICON_SIZE
      : SMALL_MAKI_ICON_SIZE;
  }

  syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap) {
    const halfIconPixels = this.getIconPixelSize() / 2;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-size', this._options.size / halfIconPixels);
  }

  syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap, hasNoRadius: boolean) {
    if (hasNoRadius) {
      mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', 0);
    } else {
      mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', this._options.size);
    }
  }

  syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', this._options.size);
  }

  syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'line-width', this._options.size);
  }

  syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(mbLayerId, 'text-size', this._options.size);
  }
}
