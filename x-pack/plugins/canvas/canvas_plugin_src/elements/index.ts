/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { areaChart } from './area_chart';
import { bubbleChart } from './bubble_chart';
import { debug } from './debug';
import { donut } from './donut';
import { dropdownFilter } from './dropdown_filter';
import { embeddable } from './embeddable';
import { horizontalBarChart } from './horizontal_bar_chart';
import { horizontalProgressBar } from './horizontal_progress_bar';
import { horizontalProgressPill } from './horizontal_progress_pill';
import { image } from './image';
import { lineChart } from './line_chart';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progressGauge } from './progress_gauge';
import { progressSemicircle } from './progress_semicircle';
import { progressWheel } from './progress_wheel';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { shape } from './shape';
import { table } from './table';
import { tiltedPie } from './tilted_pie';
import { timeFilter } from './time_filter';
import { verticalBarChart } from './vert_bar_chart';
import { verticalProgressBar } from './vertical_progress_bar';
import { verticalProgressPill } from './vertical_progress_pill';

export const elementSpecs = [
  areaChart,
  bubbleChart,
  debug,
  donut,
  dropdownFilter,
  embeddable,
  image,
  horizontalBarChart,
  horizontalProgressBar,
  horizontalProgressPill,
  lineChart,
  markdown,
  metric,
  pie,
  plot,
  progressGauge,
  progressSemicircle,
  progressWheel,
  repeatImage,
  revealImage,
  shape,
  table,
  tiltedPie,
  timeFilter,
  verticalBarChart,
  verticalProgressBar,
  verticalProgressPill,
];
