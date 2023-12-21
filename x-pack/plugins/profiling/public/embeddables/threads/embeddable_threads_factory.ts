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
import { EMBEDDABLE_THREADS } from '@kbn/observability-shared-plugin/public';
import { GetProfilingEmbeddableDependencies } from '../profiling_embeddable_provider';

interface EmbeddableThreadsInput {
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
}

export type EmbeddableThreadsEmbeddableInput = EmbeddableThreadsInput & EmbeddableInput;

export class EmbeddableThreadsFactory
  implements EmbeddableFactoryDefinition<EmbeddableThreadsEmbeddableInput>
{
  readonly type = EMBEDDABLE_THREADS;

  constructor(private getProfilingEmbeddableDependencies: GetProfilingEmbeddableDependencies) {}

  async isEditable() {
    return false;
  }

  async create(input: EmbeddableThreadsEmbeddableInput, parent?: IContainer) {
    const { EmbeddableThreads } = await import('./embeddable_threads');
    const deps = await this.getProfilingEmbeddableDependencies();
    return new EmbeddableThreads(deps, input, parent);
  }

  getDisplayName() {
    return 'Universal Profiling Threads';
  }
}
