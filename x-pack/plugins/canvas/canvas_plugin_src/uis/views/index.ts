/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped local
import { dropdownControl } from './dropdownControl';
// @ts-ignore untyped local
import { getCell } from './getCell';
// @ts-ignore untyped local
import { image } from './image';
// @ts-ignore untyped local
import { markdown } from './markdown';
// @ts-ignore untyped local
import { metricInitializer } from './metric';
// @ts-ignore untyped local
import { pie } from './pie';
// @ts-ignore untyped local
import { plot } from './plot';
// @ts-ignore untyped local
import { progress } from './progress';
// @ts-ignore untyped local
import { repeatImage } from './repeatImage';
// @ts-ignore untyped local
import { revealImage } from './revealImage';
// @ts-ignore untyped local
import { render } from './render';
// @ts-ignore untyped local
import { shape } from './shape';
// @ts-ignore untyped local
import { table } from './table';
// @ts-ignore untyped local
import { timefilterControl } from './timefilterControl';

import { SetupInitializer } from '../../plugin';

export const viewSpecs = [
  dropdownControl,
  getCell,
  image,
  markdown,
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

export const viewInitializers = [metricInitializer];

export const initializeViews: SetupInitializer<unknown[]> = (core, plugins) => {
  return [...viewSpecs, ...viewInitializers.map(initializer => initializer(core, plugins))];
};
