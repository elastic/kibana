/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { EmbeddableFlamegraphSharedComponent, FlamegraphProps } from './embeddable_flamegraph';
import { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';

const LazyEmbeddableFlamegraph = dynamic(async () => {
  const Component = await import('./embeddable_flamegraph');
  return { default: Component.EmbeddableFlamegraph };
});

export const getEmbeddableFlamegraphComponent = (
  profilingEmbeddableDependencies: ProfilingEmbeddablesDependencies
): EmbeddableFlamegraphSharedComponent => {
  return (props: FlamegraphProps) => {
    return <LazyEmbeddableFlamegraph {...props} {...profilingEmbeddableDependencies} />;
  };
};
