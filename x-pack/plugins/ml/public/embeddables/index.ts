/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableFactory,
} from './anomaly_swimlane';
import { MlSetupDependencies } from '../plugin';

export function registerEmbeddables(pluginsSetup: MlSetupDependencies) {
  const anomalySwimlaneEmbeddableFactory = new AnomalySwimlaneEmbeddableFactory();
  pluginsSetup.embeddable.registerEmbeddableFactory(
    ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    anomalySwimlaneEmbeddableFactory
  );
  return (overlays: CoreStart['overlays']) => {
    anomalySwimlaneEmbeddableFactory.setDependencies(overlays);
  };
}
