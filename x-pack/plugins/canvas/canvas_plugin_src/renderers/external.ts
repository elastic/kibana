/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { imageRenderer } from '../../../../../src/plugins/expression_image/public';
import { metricRenderer } from '../../../../../src/plugins/expression_metric/public';
import { errorRenderer, debugRenderer } from '../../../../../src/plugins/expression_error/public';
import { repeatImageRenderer } from '../../../../../src/plugins/expression_repeat_image/public';
import { revealImageRenderer } from '../../../../../src/plugins/expression_reveal_image/public';
import {
  shapeRenderer,
  progressRenderer,
} from '../../../../../src/plugins/expression_shape/public';

export const renderFunctions = [
  debugRenderer,
  errorRenderer,
  imageRenderer,
  metricRenderer,
  revealImageRenderer,
  shapeRenderer,
  repeatImageRenderer,
  progressRenderer,
];

export const renderFunctionFactories = [];
