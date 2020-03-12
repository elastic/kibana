/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { BucketSpanEstimatorData } from '../../../../../legacy/plugins/ml/public/application/services/ml_api_service';

export function estimateBucketSpanFactory(
  callAsCurrentUser: APICaller,
  callAsInternalUser: APICaller,
  isSecurityDisabled: boolean
): (config: BucketSpanEstimatorData) => Promise<any>;
