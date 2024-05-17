/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debugRendererFactory, errorRendererFactory } from '@kbn/expression-error-plugin/public';
import { imageRendererFactory } from '@kbn/expression-image-plugin/public';
import { metricRendererFactory } from '@kbn/expression-metric-plugin/public';
import { repeatImageRendererFactory } from '@kbn/expression-repeat-image-plugin/public';
import { revealImageRendererFactory } from '@kbn/expression-reveal-image-plugin/public';
import { progressRendererFactory, shapeRendererFactory } from '@kbn/expression-shape-plugin/public';

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
