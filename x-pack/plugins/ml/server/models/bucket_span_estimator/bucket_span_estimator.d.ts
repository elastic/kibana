/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { ES_AGGREGATION } from '../../../common/constants/aggregation_types';

export interface BucketSpanEstimatorData {
  aggTypes: Array<ES_AGGREGATION | null>;
  duration: {
    start: number;
    end: number;
  };
  fields: Array<string | null>;
  index: string;
  query: any;
  splitField: string | undefined;
  timeField: string | undefined;
}

export function estimateBucketSpanFactory({
  callAsCurrentUser,
  callAsInternalUser,
}: ILegacyScopedClusterClient): (config: BucketSpanEstimatorData) => Promise<any>;
