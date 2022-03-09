/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { imageRendererFactory } from '../../../../../src/plugins/expression_image/public';
import { metricRendererFactory } from '../../../../../src/plugins/expression_metric/public';
import {
  errorRendererFactory,
  debugRendererFactory,
} from '../../../../../src/plugins/expression_error/public';
import { revealImageRendererFactory } from '../../../../../src/plugins/expression_reveal_image/public';
import { repeatImageRendererFactory } from '../../../../../src/plugins/expression_repeat_image/public';
import {
  shapeRendererFactory,
  progressRendererFactory,
} from '../../../../../src/plugins/expression_shape/public';

export const renderFunctions = [];

export const renderFunctionFactories = [
  debugRendererFactory,
  errorRendererFactory,
  imageRendererFactory,
  shapeRendererFactory,
  progressRendererFactory,
  revealImageRendererFactory,
  repeatImageRendererFactory,
  metricRendererFactory,
];
