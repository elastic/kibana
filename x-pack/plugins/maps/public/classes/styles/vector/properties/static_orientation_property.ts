/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import { VECTOR_STYLES } from '../../../../../common/constants';
import { OrientationStaticOptions } from '../../../../../common/descriptor_types';

export class StaticOrientationProperty extends StaticStyleProperty<OrientationStaticOptions> {
  constructor(options: OrientationStaticOptions, styleName: VECTOR_STYLES) {
    if (typeof options.orientation !== 'number') {
      super({ orientation: 0 }, styleName);
    } else {
      super(options, styleName);
    }
  }

  syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', this._options.orientation);
  }
}
