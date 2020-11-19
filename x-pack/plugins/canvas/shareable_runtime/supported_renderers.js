/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debug } from '../canvas_plugin_src/renderers/debug';
import { error } from '../canvas_plugin_src/renderers/error';
import { image } from '../canvas_plugin_src/renderers/image';
import { repeatImage } from '../canvas_plugin_src/renderers/repeat_image';
import { revealImage } from '../canvas_plugin_src/renderers/reveal_image';
import { markdown } from '../canvas_plugin_src/renderers/markdown';
import { metric } from '../canvas_plugin_src/renderers/metric';
import { pie } from '../canvas_plugin_src/renderers/pie';
import { plot } from '../canvas_plugin_src/renderers/plot';
import { progress } from '../canvas_plugin_src/renderers/progress';
import { shape } from '../canvas_plugin_src/renderers/shape';
import { table } from '../canvas_plugin_src/renderers/table';
import { text } from '../canvas_plugin_src/renderers/text';

/**
 * This is a collection of renderers which are bundled with the runtime.  If
 * a renderer is not listed here, but is used by the Shared Workpad, it will
 * not render.  This includes any plugins.
 */
export const renderFunctions = [
  debug,
  error,
  image,
  repeatImage,
  revealImage,
  markdown,
  metric,
  pie,
  plot,
  progress,
  shape,
  table,
  text,
];

export const renderFunctionNames = renderFunctions.map((fn) => fn.name);
