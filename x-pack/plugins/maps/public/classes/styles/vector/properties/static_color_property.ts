/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import { ColorStaticOptions } from '../../../../../common/descriptor_types';

export class StaticColorProperty extends StaticStyleProperty<ColorStaticOptions> {
  syncCircleColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    mbMap.setPaintProperty(mbLayerId, 'circle-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    mbMap.setPaintProperty(mbLayerId, 'fill-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-color', this._options.color);
  }

  syncHaloBorderColorWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', this._options.color);
  }

  syncLineColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    mbMap.setPaintProperty(mbLayerId, 'line-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  syncCircleStrokeWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-opacity', alpha);
  }

  syncLabelColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    mbMap.setPaintProperty(mbLayerId, 'text-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'text-opacity', alpha);
  }

  syncLabelBorderColorWithMb(mbLayerId: string, mbMap: MbMap) {
    mbMap.setPaintProperty(mbLayerId, 'text-halo-color', this._options.color);
  }
}
