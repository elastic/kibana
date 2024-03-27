/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { MlCoreSetup } from '../plugin';
import { AnomalyChartsEmbeddableFactory } from './anomaly_charts';
import { registerAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane';
import { SingleMetricViewerEmbeddableFactory } from './single_metric_viewer';

export * from './constants';
export { getEmbeddableComponent } from './get_embeddable_component';
export * from './types';

export function registerEmbeddables(embeddable: EmbeddableSetup, core: MlCoreSetup) {
  registerAnomalySwimLaneEmbeddableFactory(core.getStartServices);

  const anomalyChartsFactory = new AnomalyChartsEmbeddableFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(anomalyChartsFactory.type, anomalyChartsFactory);

  const singleMetricViewerFactory = new SingleMetricViewerEmbeddableFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(singleMetricViewerFactory.type, singleMetricViewerFactory);
}
