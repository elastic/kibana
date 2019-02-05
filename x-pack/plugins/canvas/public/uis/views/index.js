/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dropdownControl } from './dropdown_control';
import { getCell } from './get_cell';
import { image } from './image';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progress } from './progress';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { render } from './render';
import { shape } from './shape';
import { table } from './table';
import { timefilterControl } from './timefilter_control';

export const viewSpecs = [
  dropdownControl,
  getCell,
  image,
  markdown,
  metric,
  pie,
  plot,
  progress,
  repeatImage,
  revealImage,
  render,
  shape,
  table,
  timefilterControl,
];
