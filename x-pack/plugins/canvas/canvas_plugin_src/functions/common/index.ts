/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alterColumn } from './alterColumn';
import { all } from './all';
import { any } from './any';
import { asFn } from './as';
import { axisConfig } from './axisConfig';
import { clear } from './clear';
import { compare } from './compare';
import { containerStyle } from './containerStyle';
import { context } from './context';
import { columns } from './columns';
import { csv } from './csv';
import { date } from './date';
import { doFn } from './do';
import { dropdownControl } from './dropdownControl';
import { eq } from './eq';
import { exactly } from './exactly';
import { filterrows } from './filterrows';
import { formatdate } from './formatdate';
import { formatnumber } from './formatnumber';
import { getCell } from './getCell';
import { gt } from './gt';
import { gte } from './gte';
import { head } from './head';
import { ifFn } from './if';
import { joinRows } from './join_rows';
import { lt } from './lt';
import { lte } from './lte';
import { mapCenter } from './map_center';
import { neq } from './neq';
import { ply } from './ply';
import { render } from './render';
import { replace } from './replace';
import { rounddate } from './rounddate';
import { rowCount } from './rowCount';
import { seriesStyle } from './seriesStyle';
import { sort } from './sort';
import { staticColumn } from './staticColumn';
import { string } from './string';
import { table } from './table';
import { tail } from './tail';
import { timerange } from './time_range';
import { timefilter } from './timefilter';
import { timefilterControl } from './timefilterControl';
import { switchFn } from './switch';
import { caseFn } from './case';

export const functions = [
  all,
  alterColumn,
  any,
  asFn,
  axisConfig,
  clear,
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
  formatdate,
  formatnumber,
  getCell,
  gt,
  gte,
  head,
  ifFn,
  lt,
  lte,
  joinRows,
  mapCenter,
  neq,
  ply,
  render,
  replace,
  rounddate,
  rowCount,
  seriesStyle,
  sort,
  staticColumn,
  string,
  table,
  tail,
  timefilter,
  timefilterControl,
  timerange,
  switchFn,
  caseFn,
];
