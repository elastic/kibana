/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { DynamicStyleProperty, getNumericalMbFeatureStateValue } from './dynamic_style_property';
import { OrientationDynamicOptions } from '../../../../../common/descriptor_types';

export class DynamicOrientationProperty extends DynamicStyleProperty<OrientationDynamicOptions> {
  syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      const targetName = this.getMbPropertyName();
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', ['coalesce', ['get', targetName], 0]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', 0);
    }
  }

  supportsMbFeatureState(): boolean {
    return false;
  }

  getMbPropertyValue(
    rawValue: string | number | null | undefined
  ): string | number | null | undefined {
    return getNumericalMbFeatureStateValue(rawValue);
  }
}
