/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorCode, MLErrorMessages } from '../../../common/anomaly_detection';

export class AnomalyDetectionError extends Error {
  constructor(public code: ErrorCode) {
    super(MLErrorMessages[code]);

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
