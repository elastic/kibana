/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { StackTraces, StackTracesProps } from './stack_traces';

export type EmbeddableStackTracesProps = StackTracesProps & ProfilingEmbeddablesDependencies;

export type EmbeddableStackTracesSharedComponent = React.FC<StackTracesProps>;

export function EmbeddableStackTraces({
  type,
  kuery,
  rangeFrom,
  rangeTo,
  onClick,
  onChartBrushEnd,
  ...deps
}: EmbeddableStackTracesProps) {
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <div style={{ width: '100%' }}>
        <StackTraces
          type={type}
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onClick={onClick}
          onChartBrushEnd={onChartBrushEnd}
        />
      </div>
    </ProfilingEmbeddableProvider>
  );
}
