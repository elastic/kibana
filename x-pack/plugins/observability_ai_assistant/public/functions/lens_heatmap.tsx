/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LensHeatmapFunctionArguments } from '../../common/functions/lens_heatmap';
import type { RegisterRenderFunctionDefinition } from '../types';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';
import { LensChart } from './lens_chart';
import { RenderFunction } from '../types';

export function registerLensHeatmapFunction({
  service,
  registerRenderFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerRenderFunction(
    'lens_heatmap',
    ({
      arguments: { end, start, esql, ...rest },
    }: Parameters<RenderFunction<LensHeatmapFunctionArguments, {}>>[0]) => {
      return (
        <LensChart
          chartType="heatmap"
          layerConfig={{
            ...rest,
            dataset: { esql },
          }}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
        />
      );
    }
  );
}
