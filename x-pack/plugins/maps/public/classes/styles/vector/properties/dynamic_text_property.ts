/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';
import { LabelDynamicOptions } from '../../../../../common/descriptor_types';

export class DynamicTextProperty extends DynamicStyleProperty<LabelDynamicOptions> {
  syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      // Fields that support auto-domain are normalized with a field-formatter and stored into a computed-field
      // Otherwise, the raw value is just carried over and no computed field is created.
      const targetName = this._field.supportsAutoDomain()
        ? getComputedFieldName(this._styleName, this.getFieldName())
        : this._field.getName();
      mbMap.setLayoutProperty(mbLayerId, 'text-field', ['coalesce', ['get', targetName], '']);
    } else {
      mbMap.setLayoutProperty(mbLayerId, 'text-field', null);
    }
  }

  isOrdinal() {
    return false;
  }

  supportsFieldMeta() {
    return false;
  }

  supportsMbFeatureState() {
    return false;
  }
}
