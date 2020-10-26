/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane';
import type { MlCoreSetup } from '../plugin';
import type { EmbeddableSetup } from '../../../../../src/plugins/embeddable/public';

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
}
