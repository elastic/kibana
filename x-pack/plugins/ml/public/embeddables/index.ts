/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EmbeddableSetup } from '../../../../../src/plugins/embeddable/public/plugin';
import type { MlCoreSetup } from '../plugin';
import { AnomalyChartsEmbeddableFactory } from './anomaly_charts/anomaly_charts_embeddable_factory';
import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane/anomaly_swimlane_embeddable_factory';

export * from './constants';
export * from './types';

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
}
