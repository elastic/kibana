/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { DataVisualizerGridEmbeddableFactory } from './grid_embeddable/grid_embeddable_factory';
import { DataVisualizerPluginStart, DataVisualizerStartDependencies } from '../../../plugin';

export function registerEmbeddables(
  embeddable: EmbeddableSetup,
  core: CoreSetup<DataVisualizerStartDependencies, DataVisualizerPluginStart>
) {
  const dataVisualizerGridEmbeddableFactory = new DataVisualizerGridEmbeddableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    dataVisualizerGridEmbeddableFactory.type,
    dataVisualizerGridEmbeddableFactory
  );
}
