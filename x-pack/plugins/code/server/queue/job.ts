/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '@code/esqueue';

export interface Job {
  payload: any;
  options: any;
  cancellationToken?: CancellationToken;
}
