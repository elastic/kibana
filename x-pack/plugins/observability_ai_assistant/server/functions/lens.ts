/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lensTableFunctionDefinition } from '../../common/functions/lens_table';
import { lensGaugeFunctionDefinition } from '../../common/functions/lens_gauge';
import { lensHeatmapFunctionDefinition } from '../../common/functions/lens_heatmap';
import { lensMetricFunctionDefinition } from '../../common/functions/lens_metric';
import { lensRegionmapFunctionDefinition } from '../../common/functions/lens_regionmap';
import { lensXYFunctionDefinition } from '../../common/functions/lens_xy';
import { lensTreemapFunctionDefinition } from '../../common/functions/lens_treemap';
import { lensTagcloudFunctionDefinition } from '../../common/functions/lens_tagcloud';
import { RegisterFunction } from '../service/types';

export function registerLensFunction({ registerFunction }: { registerFunction: RegisterFunction }) {
  registerFunction(lensGaugeFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensHeatmapFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensMetricFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensRegionmapFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensTableFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensTagcloudFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensTreemapFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
  registerFunction(lensXYFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
}
