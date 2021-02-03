/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayerDescriptor } from '../../common/descriptor_types';
import { lazyLoadMapModules } from '../lazy_load_bundle';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';

export const createLayerDescriptors = {
  async createSecurityLayerDescriptors(
    indexPatternId: string,
    indexPatternTitle: string
  ): Promise<LayerDescriptor[]> {
    const mapModules = await lazyLoadMapModules();
    return mapModules.createSecurityLayerDescriptors(indexPatternId, indexPatternTitle);
  },
  async createBasemapLayerDescriptor(): Promise<LayerDescriptor | null> {
    const mapModules = await lazyLoadMapModules();
    return mapModules.createBasemapLayerDescriptor();
  },
  async createESSearchSourceLayerDescriptor(
    params: CreateLayerDescriptorParams
  ): Promise<LayerDescriptor> {
    const mapModules = await lazyLoadMapModules();
    return mapModules.createESSearchSourceLayerDescriptor(params);
  },
};
