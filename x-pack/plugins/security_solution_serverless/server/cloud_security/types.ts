/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MeteringCallbackInput } from '../types';

export interface ResourceCountAggregation {
  min_timestamp: MinTimestamp;
  unique_resources: {
    value: number;
  };
}

export interface MinTimestamp {
  value: number;
  value_as_string: string;
}

export interface CloudSecurityMeteringCallbackInput
  extends Omit<MeteringCallbackInput, 'cloudSetup'> {
  projectId: string;
}
