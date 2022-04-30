/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayerDescriptor } from '../../common/descriptor_types';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';
import type { SampleValuesConfig, EMSTermJoinConfig } from '../ems_autosuggest';

export interface MapsStartApi {
  createLayerDescriptors: {
    createSecurityLayerDescriptors: (
      indexPatternId: string,
      indexPatternTitle: string
    ) => Promise<LayerDescriptor[]>;
    createBasemapLayerDescriptor: () => Promise<LayerDescriptor | null>;
    createESSearchSourceLayerDescriptor: (
      params: CreateLayerDescriptorParams
    ) => Promise<LayerDescriptor>;
  };
  suggestEMSTermJoinConfig(config: SampleValuesConfig): Promise<EMSTermJoinConfig | null>;
}
