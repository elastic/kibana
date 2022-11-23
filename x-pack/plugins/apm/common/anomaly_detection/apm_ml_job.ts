/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlJobState,
  MlDatafeedState,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Environment } from '../environment_rt';

export interface ApmMlJob {
  environment: Environment;
  version: number;
  jobId: string;
  jobState?: MlJobState;
  datafeedId?: string;
  datafeedState?: MlDatafeedState;
  bucketSpan?: string;
}
