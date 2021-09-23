/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { LabelDynamicOptions } from '../../../../../common/descriptor_types';
import { RawValue } from '../../../../../common/constants';

export class DynamicTextProperty extends DynamicStyleProperty<LabelDynamicOptions> {
  syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      const targetName = this.getMbPropertyName();
      mbMap.setLayoutProperty(mbLayerId, 'text-field', [
        'coalesce',
        [this.getMbLookupFunction(), targetName],
        '',
      ]);
    } else {
      if (typeof mbMap.getLayoutProperty(mbLayerId, 'text-field') !== 'undefined') {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', undefined);
      }
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

  getMbPropertyValue(rawValue: RawValue): RawValue {
    return this.formatField(rawValue);
  }
}
