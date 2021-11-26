/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownFactory } from '../canvas_plugin_src/renderers/markdown';
import { pie } from '../canvas_plugin_src/renderers/pie';
import { plot } from '../canvas_plugin_src/renderers/plot';
import { tableFactory } from '../canvas_plugin_src/renderers/table';
import { textFactory } from '../canvas_plugin_src/renderers/text';
import { imageRenderer as image } from '../../../../src/plugins/expression_image/public';
import {
  errorRenderer as error,
  debugRenderer as debug,
} from '../../../../src/plugins/expression_error/public';
import { repeatImageRenderer as repeatImage } from '../../../../src/plugins/expression_repeat_image/public';
import { revealImageRenderer as revealImage } from '../../../../src/plugins/expression_reveal_image/public';
import {
  shapeRenderer as shape,
  progressRenderer as progress,
} from '../../../../src/plugins/expression_shape/public';
import { metricRenderer as metric } from '../../../../src/plugins/expression_metric/public';
import { coreStartMock } from '../__fixtures__/core_dependencies';

const unboxFactory = (factory) => factory(coreStartMock, {});

const renderFunctionsFactories = [markdownFactory, textFactory, tableFactory];

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
  metric,
  pie,
  plot,
  progress,
  shape,
  ...renderFunctionsFactories.map(unboxFactory),
];

export const renderFunctionNames = [...renderFunctions.map((fn) => fn().name)];
