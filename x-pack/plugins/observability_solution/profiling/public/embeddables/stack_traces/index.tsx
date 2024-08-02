/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { EmbeddableStackTracesSharedComponent } from './embeddable_stack_traces';
import { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import type { StackTracesProps } from './stack_traces';

const LazyEmbeddableStackTraces = dynamic(async () => {
  const Component = await import('./embeddable_stack_traces');
  return { default: Component.EmbeddableStackTraces };
});

export const getEmbeddableStackTracesComponent = (
  profilingEmbeddableDependencies: ProfilingEmbeddablesDependencies
): EmbeddableStackTracesSharedComponent => {
  return (props: StackTracesProps) => {
    return <LazyEmbeddableStackTraces {...props} {...profilingEmbeddableDependencies} />;
  };
};
