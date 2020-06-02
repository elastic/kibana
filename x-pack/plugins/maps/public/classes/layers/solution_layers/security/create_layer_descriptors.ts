/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/public';
import {
  AggDescriptor,
  ColorDynamicOptions,
  LayerDescriptor,
  SizeDynamicOptions,
  StylePropertyField,
  VectorStylePropertiesDescriptor,
} from '../../../../../common/descriptor_types';

export function createLayerDescriptors(indexPattern: IndexPattern): LayerDescriptor[] {
  if (!indexPattern) {
    return [];
  }

  return [];
}
