/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is a JS file because the renderers are not strongly-typed yet. Tagging for
// visibility.
// @ts-ignore Untyped local

import { advancedFilter } from '../../../../../canvas_plugin_src/renderers/advanced_filter';
import { debug } from '../../../../../canvas_plugin_src/renderers/debug';
import { dropdownFilter } from '../../../../../canvas_plugin_src/renderers/dropdown_filter';
import { error } from '../../../../../canvas_plugin_src/renderers/error';
import { image } from '../../../../../canvas_plugin_src/renderers/image';
import { markdown } from '../../../../../canvas_plugin_src/renderers/markdown';
import { metric } from '../../../../../canvas_plugin_src/renderers/metric';
import { pie } from '../../../../../canvas_plugin_src/renderers/pie';
import { plot } from '../../../../../canvas_plugin_src/renderers/plot';
import { progress } from '../../../../../canvas_plugin_src/renderers/progress';
import { repeatImage } from '../../../../../canvas_plugin_src/renderers/repeat_image';
import { revealImage } from '../../../../../canvas_plugin_src/renderers/reveal_image';
import { shape } from '../../../../../canvas_plugin_src/renderers/shape';
import { table } from '../../../../../canvas_plugin_src/renderers/table';
import { text } from '../../../../../canvas_plugin_src/renderers/text';
import { timeFilter } from '../../../../../canvas_plugin_src/renderers/time_filter';

/**
 * This is a collection of renderers to ignore embeddables, which relies on the NP */
export const renderFunctions = [
  advancedFilter,
  debug,
  dropdownFilter,
  error,
  image,
  markdown,
  metric,
  pie,
  plot,
  progress,
  repeatImage,
  revealImage,
  shape,
  table,
  text,
  timeFilter,
];

export const renderFunctionNames = renderFunctions.map(fn => fn.name);
