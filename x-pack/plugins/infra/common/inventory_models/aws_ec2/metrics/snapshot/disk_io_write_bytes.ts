/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';

export const diskIOWriteBytes: MetricsUIAggregation = {
  diskIOWriteBytes: {
    avg: {
      field: 'aws.ec2.diskio.write.bytes_per_sec',
    },
  },
};
