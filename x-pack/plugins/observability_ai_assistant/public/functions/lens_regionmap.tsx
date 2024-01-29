/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { RegisterRenderFunctionDefinition } from '../types';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';
import { LensChart } from './lens_chart';

export function registerLensRegionmapFunction({
  service,
  registerRenderFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerRenderFunction('region_map', ({ arguments: { end, start, esql, ...rest } }) => {
    return (
      <LensChart
        chartType="regionmap"
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
  });
}
