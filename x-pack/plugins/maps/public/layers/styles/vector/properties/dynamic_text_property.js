/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';

export class DynamicTextProperty extends DynamicStyleProperty {
  syncTextFieldWithMb(mbLayerId, mbMap) {
    console.log('synctextfieldwithmb');
    if (this._field && this._field.isValid()) {
      // Fields that don't support auto-domain, are not normalized with a field-formatter and stored into a computed-field
      const targetName = this._field.supportsAutoDomain()
        ? getComputedFieldName(this._styleName, this._field.getName())
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
