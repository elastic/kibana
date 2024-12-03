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
import { getEmbeddableFunctionsComponent } from './functions';
import { ProfilingEmbeddablesDependencies } from './profiling_embeddable_provider';
import { getEmbeddableStackTracesComponent } from './stack_traces';
import { getEmbeddableSearchBarComponent } from './search_bar';

export function registerEmbeddables(deps: ProfilingEmbeddablesDependencies) {
  const {
    pluginsSetup: { observabilityShared },
  } = deps;
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_FLAMEGRAPH,
    getEmbeddableFlamegraphComponent(deps)
  );
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_FUNCTIONS,
    getEmbeddableFunctionsComponent(deps)
  );
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_PROFILING_SEARCH_BAR,
    getEmbeddableSearchBarComponent(deps)
  );
  observabilityShared.registerProfilingComponent(
    EMBEDDABLE_STACK_TRACES,
    getEmbeddableStackTracesComponent(deps)
  );
}
