/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { areaChart } from './area_chart';
import { bubbleChart } from './bubble_chart';
import { debug } from './debug';
import { donut } from './donut';
import { dropdownFilter } from './dropdown_filter';
import { image } from './image';
import { horizontalBarChart } from './horiz_bar_chart';
import { lineChart } from './line_chart';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { repeatImage } from './repeatImage';
import { revealImage } from './revealImage';
import { shape } from './shape';
import { table } from './table';
import { tiltedPie } from './tilted_pie';
import { timeFilter } from './time_filter';
import { verticalBarChart } from './vert_bar_chart';

export const elementSpecs = [
  areaChart,
  bubbleChart,
  debug,
  donut,
  dropdownFilter,
  image,
  horizontalBarChart,
  lineChart,
  markdown,
  metric,
  pie,
  plot,
  repeatImage,
  revealImage,
  shape,
  table,
  tiltedPie,
  timeFilter,
  verticalBarChart,
];
