/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-plugin/common';

export type ManualEventAnnotationType =
  | PointInTimeEventAnnotationConfig
  | RangeEventAnnotationConfig;
