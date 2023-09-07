/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { EMBEDDABLE_FLAMEGRAPH } from '@kbn/observability-shared-plugin/public';

interface EmbeddableFlamegraphInput {
  data?: BaseFlameGraph;
  isLoading: boolean;
}

export type EmbeddableFlamegraphEmbeddableInput = EmbeddableFlamegraphInput & EmbeddableInput;

export class EmbeddableFlamegraphFactory
  implements EmbeddableFactoryDefinition<EmbeddableFlamegraphEmbeddableInput>
{
  readonly type = EMBEDDABLE_FLAMEGRAPH;

  async isEditable() {
    return false;
  }

  async create(input: EmbeddableFlamegraphEmbeddableInput, parent?: IContainer) {
    const { EmbeddableFlamegraph } = await import('./embeddable_flamegraph');
    return new EmbeddableFlamegraph(input, {}, parent);
  }

  getDisplayName() {
    return 'Universal Profiling Flamegraph';
  }
}
