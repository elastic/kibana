/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { EmbeddableFunctionsSharedComponent, FunctionsProps } from './embeddable_functions';
import { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';

const LazyEmbeddableFunctions = dynamic(async () => {
  const Component = await import('./embeddable_functions');
  return { default: Component.EmbeddableFunctions };
});

export const getEmbeddableFunctionsComponent = (
  profilingEmbeddableDependencies: ProfilingEmbeddablesDependencies
): EmbeddableFunctionsSharedComponent => {
  return (props: FunctionsProps) => {
    return <LazyEmbeddableFunctions {...props} {...profilingEmbeddableDependencies} />;
  };
};
