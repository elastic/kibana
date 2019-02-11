/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable/embeddable_factories_registry';
import { MapEmbeddableFactory } from './map_embeddable_factory';

function mapEmbeddableFactoryProvider() {
  return new MapEmbeddableFactory();
}

EmbeddableFactoriesRegistryProvider.register(mapEmbeddableFactoryProvider);
