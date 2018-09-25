/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alterColumn } from '../../../../../../src/core_plugins/interpreter/common/functions/alterColumn';
import { all } from '../../../../../../src/core_plugins/interpreter/common/functions/all';
import { any } from '../../../../../../src/core_plugins/interpreter/common/functions/any';
import { asFn } from '../../../../../../src/core_plugins/interpreter/common/functions/as';
import { axisConfig } from './axisConfig';
import { compare } from '../../../../../../src/core_plugins/interpreter/common/functions/compare';
import { containerStyle } from './containerStyle';
import { clog } from './clog';
import { context } from '../../../../../../src/core_plugins/interpreter/common/functions/context';
import { columns } from '../../../../../../src/core_plugins/interpreter/common/functions/columns';
import { csv } from '../../../../../../src/core_plugins/interpreter/common/functions/csv';
import { date } from '../../../../../../src/core_plugins/interpreter/common/functions/date';
import { doFn } from '../../../../../../src/core_plugins/interpreter/common/functions/do';
import { dropdownControl } from './dropdownControl';
import { eq } from '../../../../../../src/core_plugins/interpreter/common/functions/eq';
import { exactly } from '../../../../../../src/core_plugins/interpreter/common/functions/exactly';
import { filterrows } from '../../../../../../src/core_plugins/interpreter/common/functions/filterrows';
import { font } from '../../../../../../src/core_plugins/interpreter/common/functions/font';
import { formatdate } from '../../../../../../src/core_plugins/interpreter/common/functions/formatdate';
import { formatnumber } from '../../../../../../src/core_plugins/interpreter/common/functions/formatnumber';
import { getCell } from '../../../../../../src/core_plugins/interpreter/common/functions/getCell';
import { gt } from '../../../../../../src/core_plugins/interpreter/common/functions/gt';
import { gte } from '../../../../../../src/core_plugins/interpreter/common/functions/gte';
import { head } from '../../../../../../src/core_plugins/interpreter/common/functions/head';
import { ifFn } from '../../../../../../src/core_plugins/interpreter/common/functions/if';
import { image } from './image';
import { lt } from '../../../../../../src/core_plugins/interpreter/common/functions/lt';
import { lte } from '../../../../../../src/core_plugins/interpreter/common/functions/lte';
import { mapColumn } from '../../../../../../src/core_plugins/interpreter/common/functions/mapColumn';
import { math } from '../../../../../../src/core_plugins/interpreter/common/functions/math';
import { metric } from './metric';
import { neq } from '../../../../../../src/core_plugins/interpreter/common/functions/neq';
import { palette } from './palette';
import { pie } from './pie';
import { plot } from './plot';
import { ply } from './ply';
import { progress } from './progress';
import { render } from './render';
import { replace } from '../../../../../../src/core_plugins/interpreter/common/functions/replace';
import { rounddate } from '../../../../../../src/core_plugins/interpreter/common/functions/rounddate';
import { rowCount } from '../../../../../../src/core_plugins/interpreter/common/functions/rowCount';
import { repeatImage } from './repeatImage';
import { revealImage } from './revealImage';
import { seriesStyle } from '../../../../../../src/core_plugins/interpreter/common/functions/seriesStyle';
import { shape } from '../../../../../../src/core_plugins/interpreter/common/functions/shape';
import { sort } from '../../../../../../src/core_plugins/interpreter/common/functions/sort';
import { staticColumn } from '../../../../../../src/core_plugins/interpreter/common/functions/staticColumn';
import { string } from '../../../../../../src/core_plugins/interpreter/common/functions/string';
import { table } from '../../../../../../src/core_plugins/interpreter/common/functions/table';
import { tail } from '../../../../../../src/core_plugins/interpreter/common/functions/tail';
import { timefilter } from './timefilter';
import { timefilterControl } from './timefilterControl';
import { switchFn } from '../../../../../../src/core_plugins/interpreter/common/functions/switch';
import { caseFn } from '../../../../../../src/core_plugins/interpreter/common/functions/case';

export const functions = [
  all,
  alterColumn,
  any,
  asFn,
  axisConfig,
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
  table,
  tail,
  timefilter,
  timefilterControl,
  switchFn,
  caseFn,
];
