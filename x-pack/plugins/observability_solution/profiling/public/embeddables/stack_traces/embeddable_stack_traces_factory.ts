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
import { EMBEDDABLE_STACK_TRACES } from '@kbn/observability-shared-plugin/public';
import { TopNType } from '@kbn/profiling-utils';
import { GetProfilingEmbeddableDependencies } from '../profiling_embeddable_provider';

interface EmbeddableStackTracesInput {
  type: TopNType;
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
  onClick: (category: string) => void;
  onChartBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
}

export type EmbeddableStackTracesEmbeddableInput = EmbeddableStackTracesInput & EmbeddableInput;

export class EmbeddableStackTracesFactory
  implements EmbeddableFactoryDefinition<EmbeddableStackTracesEmbeddableInput>
{
  readonly type = EMBEDDABLE_STACK_TRACES;

  constructor(private getProfilingEmbeddableDependencies: GetProfilingEmbeddableDependencies) {}

  async isEditable() {
    return false;
  }

  async create(input: EmbeddableStackTracesEmbeddableInput, parent?: IContainer) {
    const { EmbeddableStackTraces } = await import('./embeddable_stack_traces');
    const deps = await this.getProfilingEmbeddableDependencies();
    return new EmbeddableStackTraces(deps, input, parent);
  }

  getDisplayName() {
    return 'Universal Profiling Threads';
  }
}
