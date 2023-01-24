/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImageRenderer } from '@kbn/expression-image-plugin/public';
import { getErrorRenderer, getDebugRenderer } from '@kbn/expression-error-plugin/public';
import { getRevealImageRenderer } from '@kbn/expression-reveal-image-plugin/public';
import { getRepeatImageRenderer } from '@kbn/expression-repeat-image-plugin/public';
import { getShapeRenderer, getProgressRenderer } from '@kbn/expression-shape-plugin/public';
import { getMetricRenderer } from '@kbn/expression-metric-plugin/public';
import { getTextRenderer } from '../canvas_plugin_src/renderers/text';
import { getTableRenderer } from '../canvas_plugin_src/renderers/table';
import { plot } from '../canvas_plugin_src/renderers/plot';
import { pie } from '../canvas_plugin_src/renderers/pie';
import { getMarkdownRenderer } from '../canvas_plugin_src/renderers/markdown';

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
