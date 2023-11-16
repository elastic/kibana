/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
} from '../types';
import { registerLensRenderFunction } from './lens';
import { registerLensRegionmapFunction } from './lens_regionmap';
import { registerLensTagcloudFunction } from './lens_tagcloud';
import { registerLensHeatmapFunction } from './lens_heatmap';
import { registerLensTableFunction } from './lens_table';
import { registerLensMetricFunction } from './lens_metric';
import { registerLensTreemapFunction } from './lens_treemap';
import { registerLensGaugeFunction } from './lens_gauge';
import { registerLensXYFunction } from './lens_xy';

export async function registerFunctions({
  registerRenderFunction,
  service,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  service: ObservabilityAIAssistantService;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
    registerLensRenderFunction({ service, pluginsStart, registerRenderFunction });
    registerLensMetricFunction({ service, pluginsStart, registerFunction });
    registerLensGaugeFunction({ service, pluginsStart, registerFunction });
    registerLensHeatmapFunction({ service, pluginsStart, registerFunction });
    registerLensRegionmapFunction({ service, pluginsStart, registerFunction });
    registerLensTableFunction({ service, pluginsStart, registerFunction });
    registerLensTagcloudFunction({ service, pluginsStart, registerFunction });
    registerLensTreemapFunction({ service, pluginsStart, registerFunction });
    registerLensXYFunction({ service, pluginsStart, registerFunction });
}
