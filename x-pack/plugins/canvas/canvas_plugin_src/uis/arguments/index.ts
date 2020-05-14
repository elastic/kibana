/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { axisConfig } from './axis_config';
// @ts-ignore untyped local
import { datacolumn } from './datacolumn';
import { dateFormatInitializer } from './date_format';
// @ts-ignore untyped local
import { filterGroup } from './filter_group';
// @ts-ignore untyped local
import { imageUpload } from './image_upload';
// @ts-ignore untyped local
import { number } from './number';
import { numberFormatInitializer } from './number_format';
// @ts-ignore untyped local
import { palette } from './palette';
// @ts-ignore untyped local
import { percentage } from './percentage';
// @ts-ignore untyped local
import { range } from './range';
// @ts-ignore untyped local
import { select } from './select';
// @ts-ignore untyped local
import { shape } from './shape';
// @ts-ignore untyped local
import { string } from './string';
// @ts-ignore untyped local
import { textarea } from './textarea';
// @ts-ignore untyped local
import { toggle } from './toggle';

import { SetupInitializer } from '../../plugin';

export const args = [
  axisConfig,
  datacolumn,
  filterGroup,
  imageUpload,
  number,
  palette,
  percentage,
  range,
  select,
  shape,
  string,
  textarea,
  toggle,
];

export const initializers = [dateFormatInitializer, numberFormatInitializer];

export const initializeArgs: SetupInitializer<any> = (core, plugins) => {
  return [...args, ...initializers.map(initializer => initializer(core, plugins))];
};
