/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane';
import { MlPluginStart, MlStartDependencies } from '../plugin';
import { EmbeddableSetup } from '../../../../../src/plugins/embeddable/public';

export function registerEmbeddables(
  embeddable: EmbeddableSetup,
  core: CoreSetup<MlStartDependencies, MlPluginStart>
) {
  const anomalySwimlaneEmbeddableFactory = new AnomalySwimlaneEmbeddableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    anomalySwimlaneEmbeddableFactory.type,
    anomalySwimlaneEmbeddableFactory
  );
}
