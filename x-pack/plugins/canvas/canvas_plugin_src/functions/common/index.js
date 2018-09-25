/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { axisConfig } from './axisConfig';
import { containerStyle } from './containerStyle';
import { clog } from './clog';
import { dropdownControl } from './dropdownControl';
import { image } from './image';
import { metric } from './metric';
import { palette } from './palette';
import { pie } from './pie';
import { plot } from './plot';
import { ply } from './ply';
import { render } from './render';
import { repeatImage } from './repeatImage';
import { revealImage } from './revealImage';
import { timefilter } from './timefilter';
import { timefilterControl } from './timefilterControl';

export const functions = [
  axisConfig,
  clog,
  containerStyle,
  dropdownControl,
  image,
  metric,
  palette,
  pie,
  plot,
  ply,
  render,
  repeatImage,
  revealImage,
  timefilter,
  timefilterControl,
];
