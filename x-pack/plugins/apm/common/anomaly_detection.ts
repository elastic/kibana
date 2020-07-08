/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TRANSACTION_TYPE } from './elasticsearch_fieldnames';

export interface MaxAnomaly {
  [TRANSACTION_TYPE]?: string;
  anomaly_score?: number;
  actual_value?: number;
  job_id?: string;
}
