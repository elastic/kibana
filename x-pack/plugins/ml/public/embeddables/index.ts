/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane';
import type { MlCoreSetup } from '../plugin';
import { AnomalyChartsEmbeddableFactory } from './anomaly_charts';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from './constants';

export * from './constants';
export * from './types';

export { getEmbeddableComponent } from './get_embeddable_component';

export function registerEmbeddables(embeddable: EmbeddableSetup, core: MlCoreSetup) {
  const anomalySwimlaneEmbeddableFactory = new AnomalySwimlaneEmbeddableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    anomalySwimlaneEmbeddableFactory.type,
    anomalySwimlaneEmbeddableFactory
  );

  const anomalyChartsFactory = new AnomalyChartsEmbeddableFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(anomalyChartsFactory.type, anomalyChartsFactory);

  registerReactEmbeddableFactory(ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE, async () => {
    const { getSingleMetricViewerEmbeddableFactory } = await import('./single_metric_viewer');
    return getSingleMetricViewerEmbeddableFactory(core.getStartServices);
  });
}
