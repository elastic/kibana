/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';
import { VECTOR_STYLES } from '../../../../../common/constants';
import { OrientationDynamicOptions } from '../../../../../common/descriptor_types';

export class DynamicOrientationProperty extends DynamicStyleProperty<OrientationDynamicOptions> {
  syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      const targetName = this._field.supportsAutoDomain()
        ? getComputedFieldName(VECTOR_STYLES.ICON_ORIENTATION, this.getFieldName())
        : this._field.getName();
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', ['coalesce', ['get', targetName], 0]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', 0);
    }
  }

  supportsMbFeatureState() {
    return false;
  }
}
