/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors as alterColumn } from './alterColumn';
import { errors as axisConfig } from './axisConfig';
import { errors as compare } from './compare';
import { errors as containerStyle } from './containerStyle';
import { errors as csv } from './csv';
import { errors as date } from './date';
import { errors as font } from './font';
import { errors as getCell } from './getCell';
import { errors as image } from './image';
import { errors as math } from './math';
import { errors as ply } from './ply';
import { errors as progress } from './progress';
import { errors as revealImage } from './revealImage';
import { errors as timefilter } from './timefilter';
import { errors as demodata } from './demodata';
import { errors as pointseries } from './pointseries';

export const getFunctionErrors = () => ({
  alterColumn,
  axisConfig,
  compare,
  containerStyle,
  csv,
  date,
  font,
  getCell,
  image,
  math,
  ply,
  progress,
  revealImage,
  timefilter,
  demodata,
  pointseries,
});
