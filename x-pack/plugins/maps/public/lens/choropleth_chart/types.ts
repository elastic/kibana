/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensMultiTable } from '@kbn/lens-plugin/common';

export interface ChoroplethChartState {
  layerId: string;
  emsLayerId?: string;
  emsField?: string;
  regionAccessor?: string;
  valueAccessor?: string;
}

export interface ChoroplethChartConfig extends ChoroplethChartState {
  title: string;
  description: string;
}

export interface ChoroplethChartProps {
  data: LensMultiTable;
  args: ChoroplethChartConfig;
}
