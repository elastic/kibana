/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MIN_LOOK_BACK_WINDOW as MIN_LOOK_BACK_WINDOW_V1,
  MAX_LOOK_BACK_WINDOW as MAX_LOOK_BACK_WINDOW_V1,
  MIN_STATUS_CHANGE_THRESHOLD as MIN_STATUS_CHANGE_THRESHOLD_V1,
  MAX_STATUS_CHANGE_THRESHOLD as MAX_STATUS_CHANGE_THRESHOLD_V1,
} from '../../constants/v1';
import { validateFlappingV1 } from '../../../validation';

export const flappingSchema = schema.object(
  {
    look_back_window: schema.number({
      min: MIN_LOOK_BACK_WINDOW_V1,
      max: MAX_LOOK_BACK_WINDOW_V1,
    }),
    status_change_threshold: schema.number({
      min: MIN_STATUS_CHANGE_THRESHOLD_V1,
      max: MAX_STATUS_CHANGE_THRESHOLD_V1,
    }),
  },
  { validate: validateFlappingV1 }
);
