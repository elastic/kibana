/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayerDescriptor } from '../../common/descriptor_types';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';

export const createLayerDescriptors = {
  async createSecurityLayerDescriptors(
    indexPatternId: string,
    indexPatternTitle: string
  ): Promise<LayerDescriptor[]> {
    const { createSecurityLayerDescriptors } = await import(
      '../classes/layers/wizards/solution_layers/security'
    );
    return createSecurityLayerDescriptors(indexPatternId, indexPatternTitle);
  },
  async createBasemapLayerDescriptor(): Promise<LayerDescriptor | null> {
    const { createBasemapLayerDescriptor } = await import(
      '../classes/layers/create_basemap_layer_descriptor'
    );
    return createBasemapLayerDescriptor();
  },
  async createESSearchSourceLayerDescriptor(
    params: CreateLayerDescriptorParams
  ): Promise<LayerDescriptor> {
    const { createLayerDescriptor } = await import('../classes/sources/es_search_source');
    return createLayerDescriptor(params);
  },
};
