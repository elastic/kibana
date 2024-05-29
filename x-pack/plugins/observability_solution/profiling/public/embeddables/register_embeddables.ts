/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMBEDDABLE_FLAMEGRAPH,
  EMBEDDABLE_FUNCTIONS,
  EMBEDDABLE_PROFILING_SEARCH_BAR,
  EMBEDDABLE_STACK_TRACES,
} from '@kbn/observability-shared-plugin/public';
import { getEmbeddableFlamegraphComponent } from './flamegraph';
import { EmbeddableFunctionsFactory } from './functions/embeddable_functions_factory';
import { ProfilingEmbeddablesDependencies } from './profiling_embeddable_provider';
import { EmbeddableSearchBarFactory } from './search_bar/embeddable_search_bar_factory';
import { getEmbeddableStackTracesComponent } from './stack_traces';

export function registerEmbeddables(deps: ProfilingEmbeddablesDependencies) {
  const {
    pluginsSetup: { embeddable, observabilityShared },
  } = deps;
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_FLAMEGRAPH,
    getEmbeddableFlamegraphComponent(deps)
  );
  embeddable.registerEmbeddableFactory(
    EMBEDDABLE_FUNCTIONS,
    new EmbeddableFunctionsFactory(() => Promise.resolve(deps))
  );
  embeddable.registerEmbeddableFactory(
    EMBEDDABLE_PROFILING_SEARCH_BAR,
    new EmbeddableSearchBarFactory(() => Promise.resolve(deps))
  );
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_STACK_TRACES,
    getEmbeddableStackTracesComponent(deps)
  );
}
