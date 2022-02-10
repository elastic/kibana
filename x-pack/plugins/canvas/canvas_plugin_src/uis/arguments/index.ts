/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { axisConfig } from './axis_config';
// @ts-expect-error untyped local
import { datacolumn } from './datacolumn';
import { dateFormatInitializer } from './date_format';
// @ts-expect-error untyped local
import { filterGroup } from './filter_group';
// @ts-expect-error untyped local
import { imageUpload } from './image_upload';
// @ts-expect-error untyped local
import { number } from './number';
import { numberFormatInitializer } from './number_format';
import { palette, stopsPalette } from './palette';
// @ts-expect-error untyped local
import { percentage } from './percentage';
// @ts-expect-error untyped local
import { range } from './range';
// @ts-expect-error untyped local
import { select } from './select';
// @ts-expect-error untyped local
import { shape } from './shape';
// @ts-expect-error untyped local
import { string } from './string';
// @ts-expect-error untyped local
import { textarea } from './textarea';
// @ts-expect-error untyped local
import { toggle } from './toggle';
import { visdimension } from './vis_dimension';
import { colorPicker } from './color_picker';

import { SetupInitializer } from '../../plugin';

export const args = [
  axisConfig,
  datacolumn,
  filterGroup,
  imageUpload,
  number,
  palette,
  stopsPalette,
  percentage,
  range,
  select,
  shape,
  string,
  textarea,
  toggle,
  visdimension,
  colorPicker,
];

export const initializers = [dateFormatInitializer, numberFormatInitializer];

export const initializeArgs: SetupInitializer<any> = (core, plugins) => {
  return [...args, ...initializers.map((initializer) => initializer(core, plugins))];
};
