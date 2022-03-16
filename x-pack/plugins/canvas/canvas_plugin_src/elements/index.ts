/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyElementStrings } from '../../i18n/elements';
import { areaChart } from './area_chart';
import { bubbleChart } from './bubble_chart';
import { debug } from './debug';
import { dropdownFilter } from './dropdown_filter';
import { filterDebug } from './filter_debug';
import { horizontalBarChart } from './horizontal_bar_chart';
import { horizontalProgressBar } from './horizontal_progress_bar';
import { horizontalProgressPill } from './horizontal_progress_pill';
import { image } from './image';
import { lineChart } from './line_chart';
import { markdown } from './markdown';
import { metricElementInitializer } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progressGauge } from './progress_gauge';
import { progressSemicircle } from './progress_semicircle';
import { progressWheel } from './progress_wheel';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { shape } from './shape';
import { table } from './table';
import { timeFilter } from './time_filter';
import { verticalBarChart } from './vert_bar_chart';
import { verticalProgressBar } from './vertical_progress_bar';
import { verticalProgressPill } from './vertical_progress_pill';
import { tagCloud } from './tag_cloud';
import { metricVis } from './metric_vis';
import { heatmap } from './heatmap';

import { SetupInitializer } from '../plugin';
import { ElementFactory } from '../../types';

const elementSpecs = [
  areaChart,
  bubbleChart,
  debug,
  dropdownFilter,
  filterDebug,
  image,
  horizontalBarChart,
  horizontalProgressBar,
  horizontalProgressPill,
  lineChart,
  markdown,
  pie,
  plot,
  progressGauge,
  progressSemicircle,
  progressWheel,
  repeatImage,
  revealImage,
  shape,
  table,
  timeFilter,
  verticalBarChart,
  verticalProgressBar,
  verticalProgressPill,
  tagCloud,
  heatmap,
];

const initializeElementFactories = [metricElementInitializer];

export const initializeElements: SetupInitializer<ElementFactory[]> = (core, plugins) => {
  const specs = [
    ...elementSpecs,
    ...initializeElementFactories.map((factory) => factory(core, plugins)),
  ];
  return applyElementStrings(specs);
};

// For testing purpose. Will be removed after exposing `metricVis` element.
export const initializeElementsSpec: SetupInitializer<ElementFactory[]> = (core, plugins) => {
  const specs = initializeElements(core, plugins);
  return [...applyElementStrings([metricVis]), ...specs];
};
