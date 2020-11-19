/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import { LabelStaticOptions } from '../../../../../common/descriptor_types';

export class StaticTextProperty extends StaticStyleProperty<LabelStaticOptions> {
  isComplete() {
    return this.getOptions().value.length > 0;
  }

  syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this.getOptions().value.length) {
      mbMap.setLayoutProperty(mbLayerId, 'text-field', this.getOptions().value);
    } else {
      mbMap.setLayoutProperty(mbLayerId, 'text-field', null);
    }
  }
}
