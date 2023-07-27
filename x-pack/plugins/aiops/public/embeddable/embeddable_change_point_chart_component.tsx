/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import {
  EmbeddableFactory,
  EmbeddableOutput,
  EmbeddableRoot,
  useEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { EuiLoadingChart } from '@elastic/eui';
import type { AiopsPluginStartDeps } from '../types';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from './embeddable_change_point_chart_factory';
import { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';

export interface EmbeddableChangePointChartProps {
  dataViewId: string;
  timeRange: TimeRange;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  maxSeriesToPlot?: number;
}

export function getEmbeddableChangePointChart(core: CoreStart, plugins: AiopsPluginStartDeps) {
  const { embeddable: embeddableStart } = plugins;
  const factory = embeddableStart.getEmbeddableFactory<EmbeddableChangePointChartInput>(
    EMBEDDABLE_CHANGE_POINT_CHART_TYPE
  )!;

  return (props: any) => {
    const input = { ...props };
    return <EmbeddableRootWrapper factory={factory} input={input} />;
  };
}

function EmbeddableRootWrapper({
  factory,
  input,
}: {
  factory: EmbeddableFactory<EmbeddableChangePointChartInput, EmbeddableOutput>;
  input: EmbeddableChangePointChartInput;
}) {
  const [embeddable, loading, error] = useEmbeddableFactory<EmbeddableChangePointChartInput>({
    factory,
    input,
  });
  if (loading) {
    return <EuiLoadingChart />;
  }
  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
}
