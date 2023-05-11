/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { ExplainLogRateSpikesViewEmbeddableFactory } from './explain_log_rate_spikes_view_embeddable/explain_log_rate_spikes_view_embeddable_factory';
import { AiopsPluginStart, AiopsPluginStartDeps } from '../../../types';

export function registerEmbeddables(
  embeddable: EmbeddableSetup,
  core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>
) {
  const dataVisualizerGridEmbeddableFactory = new ExplainLogRateSpikesViewEmbeddableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    dataVisualizerGridEmbeddableFactory.type,
    dataVisualizerGridEmbeddableFactory
  );
}
