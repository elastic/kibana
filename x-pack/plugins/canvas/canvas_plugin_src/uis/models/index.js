/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pointseries } from './point_series';
import { math } from './math';
import { tagcloud } from './tagcloud';
import { metricVis } from './metric_vis';
import { heatmapLegend } from './heatmap_legend';
import { heatmapGrid } from './heatmap_grid';

export const modelSpecs = [pointseries, math, tagcloud, metricVis, heatmapLegend, heatmapGrid];
