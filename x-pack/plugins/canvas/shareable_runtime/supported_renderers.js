/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownRenderer } from '../canvas_plugin_src/renderers/markdown';
import { pie } from '../canvas_plugin_src/renderers/pie';
import { plot } from '../canvas_plugin_src/renderers/plot';
import { getTableRenderer } from '../canvas_plugin_src/renderers/table';
import { getTextRenderer } from '../canvas_plugin_src/renderers/text';
import { getImageRenderer } from '../../../../src/plugins/expression_image/public';
import {
  getErrorRenderer,
  getDebugRenderer,
} from '../../../../src/plugins/expression_error/public';
import { getRevealImageRenderer } from '../../../../src/plugins/expression_reveal_image/public';
import { getRepeatImageRenderer } from '../../../../src/plugins/expression_repeat_image/public';
import {
  getShapeRenderer,
  getProgressRenderer,
} from '../../../../src/plugins/expression_shape/public';
import { getMetricRenderer } from '../../../../src/plugins/expression_metric/public';

const unboxFactory = (factory) => factory();

const renderFunctionsFactories = [
  getMarkdownRenderer,
  getTextRenderer,
  getTableRenderer,
  getErrorRenderer,
  getDebugRenderer,
  getImageRenderer,
  getShapeRenderer,
  getProgressRenderer,
  getRevealImageRenderer,
  getRepeatImageRenderer,
  getMetricRenderer,
];

/**
 * This is a collection of renderers which are bundled with the runtime.  If
 * a renderer is not listed here, but is used by the Shared Workpad, it will
 * not render.  This includes any plugins.
 */
export const renderFunctions = [pie, plot, ...renderFunctionsFactories.map(unboxFactory)];

export const renderFunctionNames = [...renderFunctions.map((fn) => fn().name)];
