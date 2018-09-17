/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { all } from './all';
import { alterColumn } from './alterColumn';
import { any } from './any';
import { asFn } from './as';
import { axisConfig } from './axisConfig';
import { caseFn } from './case';
import { clog } from './clog';
import { columns } from './columns';
import { compare } from './compare';
import { containerStyle } from './containerStyle';
import { context } from './context';
import { csv } from './csv';
import { date } from './date';
import { doFn } from './do';
import { dropdownControl } from './dropdownControl';
import { eq } from './eq';
import { exactly } from './exactly';
import { filterrows } from './filterrows';
import { font } from './font';
import { formatdate } from './formatdate';
import { formatnumber } from './formatnumber';
import { getCell } from './getCell';
import { gt } from './gt';
import { gte } from './gte';
import { head } from './head';
import { ifFn } from './if';
import { image } from './image';
import { lt } from './lt';
import { lte } from './lte';
import { mapColumn } from './mapColumn';
import { math } from './math';
import { metric } from './metric';
import { neq } from './neq';
import { palette } from './palette';
import { pie } from './pie';
import { plot } from './plot';
import { ply } from './ply';
import { progress } from './progress';
import { render } from './render';
import { repeatImage } from './repeatImage';
import { replace } from './replace';
import { revealImage } from './revealImage';
import { rounddate } from './rounddate';
import { rowCount } from './rowCount';
import { seriesStyle } from './seriesStyle';
import { shape } from './shape';
import { sort } from './sort';
import { staticColumn } from './staticColumn';
import { string } from './string';
import { switchFn } from './switch';
import { table } from './table';
import { tail } from './tail';
import { timefilter } from './timefilter';
import { timefilterControl } from './timefilterControl';
import { visualize } from './visualize';

export const functions = [
  all,
  alterColumn,
  any,
  asFn,
  axisConfig,
  caseFn,
  clog,
  columns,
  compare,
  containerStyle,
  context,
  csv,
  date,
  doFn,
  dropdownControl,
  eq,
  exactly,
  filterrows,
  font,
  formatdate,
  formatnumber,
  getCell,
  gt,
  gte,
  head,
  ifFn,
  image,
  lt,
  lte,
  mapColumn,
  math,
  metric,
  neq,
  palette,
  pie,
  plot,
  ply,
  progress,
  render,
  repeatImage,
  replace,
  revealImage,
  rounddate,
  rowCount,
  seriesStyle,
  shape,
  sort,
  staticColumn,
  string,
  switchFn,
  table,
  tail,
  timefilter,
  timefilterControl,
  visualize,
];
