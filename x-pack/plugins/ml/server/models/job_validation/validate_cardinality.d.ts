/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';
import {
  Job,
  Datafeed,
} from '../../../../../legacy/plugins/ml/common/types/anomaly_detection_jobs';

interface ValidateCardinalityConfig extends Job {
  datafeed_config?: Datafeed;
}

export function validateCardinality(
  callAsCurrentUser: APICaller,
  job: ValidateCardinalityConfig
): any[];
