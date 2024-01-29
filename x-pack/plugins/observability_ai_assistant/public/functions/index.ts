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
  registerLensMetricFunction({ service, pluginsStart, registerRenderFunction });
  registerLensGaugeFunction({ service, pluginsStart, registerRenderFunction });
  registerLensHeatmapFunction({ service, pluginsStart, registerRenderFunction });
  registerLensRegionmapFunction({ service, pluginsStart, registerRenderFunction });
  registerLensTableFunction({ service, pluginsStart, registerRenderFunction });
  registerLensTagcloudFunction({ service, pluginsStart, registerRenderFunction });
  registerLensTreemapFunction({ service, pluginsStart, registerRenderFunction });
  registerLensXYFunction({ service, pluginsStart, registerRenderFunction });
}
