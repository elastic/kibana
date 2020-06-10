/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayerDescriptor } from '../../common/descriptor_types';
import { lazyLoadMapModules } from '../lazy_load_bundle';

export async function createSecurityLayerDescriptors(
  indexPatternId: string,
  indexPatternTitle: string
): Promise<LayerDescriptor[]> {
  const mapModules = await lazyLoadMapModules();
  return mapModules.createSecurityLayerDescriptors(indexPatternId, indexPatternTitle);
}
