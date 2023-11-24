/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import {
  EmbeddableProfilingSearchBarProps,
  EMBEDDABLE_PROFILING_SEARCH_BAR,
} from '@kbn/observability-shared-plugin/public';
import type { GetProfilingEmbeddableDependencies } from '../profiling_embeddable_provider';

export type EmbeddableSearchBarEmbeddableInput = EmbeddableProfilingSearchBarProps &
  EmbeddableInput;

export class EmbeddableSearchBarFactory
  implements EmbeddableFactoryDefinition<EmbeddableSearchBarEmbeddableInput>
{
  readonly type = EMBEDDABLE_PROFILING_SEARCH_BAR;

  constructor(private getProfilingEmbeddableDependencies: GetProfilingEmbeddableDependencies) {}

  async isEditable() {
    return false;
  }

  async create(input: EmbeddableSearchBarEmbeddableInput, parent?: IContainer) {
    const { EmbeddableSearchBar } = await import('./embeddable_search_bar');
    const deps = await this.getProfilingEmbeddableDependencies();
    return new EmbeddableSearchBar(deps, input, parent);
  }

  getDisplayName() {
    return 'Universal Profiling Search bar';
  }
}
