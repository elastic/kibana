/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors as alterColumn } from './dict/alter_column';
import { errors as asset } from './dict/asset';
import { errors as axisConfig } from './dict/axis_config';
import { errors as compare } from './dict/compare';
import { errors as containerStyle } from './dict/container_style';
import { errors as csv } from './dict/csv';
import { errors as date } from './dict/date';
import { errors as demodata } from './dict/demodata';
import { errors as getCell } from './dict/get_cell';
import { errors as image } from './dict/image';
import { errors as joinRows } from './dict/join_rows';
import { errors as math } from './dict/math';
import { errors as ply } from './dict/ply';
import { errors as pointseries } from './dict/pointseries';
import { errors as progress } from './dict/progress';
import { errors as revealImage } from './dict/reveal_image';
import { errors as timefilter } from './dict/timefilter';
import { errors as to } from './dict/to';

export const getFunctionErrors = () => ({
  alterColumn,
  asset,
  axisConfig,
  compare,
  containerStyle,
  csv,
  date,
  demodata,
  getCell,
  image,
  joinRows,
  math,
  ply,
  pointseries,
  progress,
  revealImage,
  timefilter,
  to,
});
