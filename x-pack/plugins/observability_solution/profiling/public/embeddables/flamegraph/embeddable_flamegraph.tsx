/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BaseFlameGraph, createFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import { profilingShowErrorFrames } from '@kbn/observability-plugin/common';
import { FlameGraph } from '../../components/flamegraph';
import { AsyncEmbeddableComponent } from '../async_embeddable_component';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';

export type EmbeddableFlamegraphProps = FlamegraphProps & ProfilingEmbeddablesDependencies;

export type EmbeddableFlamegraphSharedComponent = React.FC<FlamegraphProps>;

export interface FlamegraphProps {
  data?: BaseFlameGraph;
  isLoading: boolean;
}

export function EmbeddableFlamegraph({ data, isLoading, ...deps }: EmbeddableFlamegraphProps) {
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <Flamegraph isLoading={isLoading} data={data} />
    </ProfilingEmbeddableProvider>
  );
}

function Flamegraph({ isLoading, data }: FlamegraphProps) {
  const { core } = useProfilingDependencies().start;
  const showErrorFrames = core.uiSettings.get<boolean>(profilingShowErrorFrames);
  const flamegraph = !isLoading && data ? createFlameGraph(data, showErrorFrames) : undefined;
  return (
    <AsyncEmbeddableComponent isLoading={isLoading}>
      <>
        {flamegraph && (
          <FlameGraph primaryFlamegraph={flamegraph} id="embddable_profiling" isEmbedded />
        )}
      </>
    </AsyncEmbeddableComponent>
  );
}
