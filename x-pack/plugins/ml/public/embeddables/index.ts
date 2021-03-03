/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane';
import type { MlCoreSetup } from '../plugin';
import type { EmbeddableSetup } from '../../../../../src/plugins/embeddable/public';
import { AnomalyExplorerEmbeddableFactory } from './anomaly_explorer';

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

  const anomalyExplorerFactory = new AnomalyExplorerEmbeddableFactory(core.getStartServices);

  embeddable.registerEmbeddableFactory(anomalyExplorerFactory.type, anomalyExplorerFactory);
}
