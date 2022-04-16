/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
import { Environment } from '../environment_rt';

export interface ApmMlJob {
  environment: Environment;
  version: number;
  jobId: string;
  jobState?: JOB_STATE;
  datafeedId?: string;
  datafeedState?: DATAFEED_STATE;
}
