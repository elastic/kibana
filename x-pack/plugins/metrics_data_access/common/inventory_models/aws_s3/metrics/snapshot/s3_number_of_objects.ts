/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';

export const s3NumberOfObjects: MetricsUIAggregation = {
  s3NumberOfObjects: {
    max: {
      field: 'aws.s3_daily_storage.number_of_objects',
    },
  },
};
