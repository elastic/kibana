/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TopNFunctions } from '@kbn/profiling-utils';
import { AsyncEmbeddableComponent } from '../async_embeddable_component';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { EmbeddableFunctionsGrid } from './embeddable_functions_grid';

export type EmbeddableFunctionsProps = FunctionsProps & ProfilingEmbeddablesDependencies;

export type EmbeddableFunctionsSharedComponent = React.FC<FunctionsProps>;

export interface FunctionsProps {
  data?: TopNFunctions;
  isLoading: boolean;
  rangeFrom: number;
  rangeTo: number;
  showFullScreenSelector?: boolean;
}

export function EmbeddableFunctions({
  data,
  isLoading,
  rangeFrom,
  rangeTo,
  showFullScreenSelector,
  ...deps
}: EmbeddableFunctionsProps) {
  const totalSeconds = useMemo(() => (rangeTo - rangeFrom) / 1000, [rangeFrom, rangeTo]);
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <AsyncEmbeddableComponent isLoading={isLoading}>
        <div style={{ width: '100%' }}>
          <EmbeddableFunctionsGrid
            data={data}
            totalSeconds={totalSeconds}
            showFullScreenSelector={showFullScreenSelector}
          />
        </div>
      </AsyncEmbeddableComponent>
    </ProfilingEmbeddableProvider>
  );
}
