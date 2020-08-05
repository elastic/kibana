/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error untyped local
import { dropdownControl } from './dropdownControl';
// @ts-expect-error untyped local
import { getCell } from './getCell';
// @ts-expect-error untyped local
import { image } from './image';
// @ts-expect-error untyped local
import { markdown } from './markdown';
import { metricInitializer } from './metric';
// @ts-expect-error untyped local
import { pie } from './pie';
// @ts-expect-error untyped local
import { plot } from './plot';
// @ts-expect-error untyped local
import { progress } from './progress';
// @ts-expect-error untyped local
import { repeatImage } from './repeatImage';
// @ts-expect-error untyped local
import { revealImage } from './revealImage';
// @ts-expect-error untyped local
import { render } from './render';
// @ts-expect-error untyped local
import { shape } from './shape';
// @ts-expect-error untyped local
import { table } from './table';
// @ts-expect-error untyped local
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
  return [...viewSpecs, ...viewInitializers.map((initializer) => initializer(core, plugins))];
};
