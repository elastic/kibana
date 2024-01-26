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
import { EMBEDDABLE_FUNCTIONS } from '@kbn/observability-shared-plugin/public';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { GetProfilingEmbeddableDependencies } from '../profiling_embeddable_provider';

interface EmbeddableFunctionsInput {
  data?: TopNFunctions;
  isLoading: boolean;
  rangeFrom: number;
  rangeTo: number;
}

export type EmbeddableFunctionsEmbeddableInput = EmbeddableFunctionsInput & EmbeddableInput;

export class EmbeddableFunctionsFactory
  implements EmbeddableFactoryDefinition<EmbeddableFunctionsEmbeddableInput>
{
  readonly type = EMBEDDABLE_FUNCTIONS;

  constructor(private getProfilingEmbeddableDependencies: GetProfilingEmbeddableDependencies) {}

  async isEditable() {
    return false;
  }

  async create(input: EmbeddableFunctionsEmbeddableInput, parent?: IContainer) {
    const { EmbeddableFunctions } = await import('./embeddable_functions');
    const deps = await this.getProfilingEmbeddableDependencies();
    return new EmbeddableFunctions(deps, input, parent);
  }

  getDisplayName() {
    return 'Universal Profiling Functions';
  }
}
