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
import { shapeRenderer } from '../../../../../src/plugins/expression_shape/public';
import { tagCloudVisRenderer as tagCloudRenderer } from '../../../../../src/plugins/vis_type_tagcloud/public';

export const renderFunctions = [
  debugRenderer,
  errorRenderer,
  imageRenderer,
  metricRenderer,
  revealImageRenderer,
  shapeRenderer,
  repeatImageRenderer,
  tagCloudRenderer,
];

export const renderFunctionFactories = [];
