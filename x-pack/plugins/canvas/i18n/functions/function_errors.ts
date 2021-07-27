/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { errors as joinRows } from './dict/join_rows';
import { errors as ply } from './dict/ply';
import { errors as pointseries } from './dict/pointseries';
import { errors as progress } from './dict/progress';
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
  joinRows,
  ply,
  pointseries,
  progress,
  timefilter,
  to,
});
