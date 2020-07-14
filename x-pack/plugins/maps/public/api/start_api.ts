/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayerDescriptor } from '../../common/descriptor_types';
import { SourceRegistryEntry } from '../classes/sources/source_registry';
import { LayerWizard } from '../classes/layers/layer_wizard_registry';

export interface MapsStartApi {
  createSecurityLayerDescriptors: (
    indexPatternId: string,
    indexPatternTitle: string
  ) => Promise<LayerDescriptor[]>;
  registerLayerWizard(layerWizard: LayerWizard): Promise<void>;
  registerSource(entry: SourceRegistryEntry): Promise<void>;
}
