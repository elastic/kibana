/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import {
  EMBEDDABLE_FLAMEGRAPH,
  EMBEDDABLE_FUNCTIONS,
} from '@kbn/observability-shared-plugin/public';
import { EmbeddableFlamegraphFactory } from './flamegraph/embeddable_flamegraph_factory';
import { EmbeddableFunctionsFactory } from './functions/embeddable_functions_factory';

export function registerEmbeddables(embeddable: EmbeddableSetup) {
  embeddable.registerEmbeddableFactory(EMBEDDABLE_FLAMEGRAPH, new EmbeddableFlamegraphFactory());
  embeddable.registerEmbeddableFactory(EMBEDDABLE_FUNCTIONS, new EmbeddableFunctionsFactory());
}
