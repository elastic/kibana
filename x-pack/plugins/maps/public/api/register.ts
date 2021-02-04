/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SourceRegistryEntry } from '../classes/sources/source_registry';
import { LayerWizard } from '../classes/layers/layer_wizard_registry';
import { lazyLoadMapModules } from '../lazy_load_bundle';

export async function registerLayerWizard(layerWizard: LayerWizard): Promise<void> {
  const mapModules = await lazyLoadMapModules();
  return mapModules.registerLayerWizard(layerWizard);
}

export async function registerSource(entry: SourceRegistryEntry): Promise<void> {
  const mapModules = await lazyLoadMapModules();
  return mapModules.registerSource(entry);
}
