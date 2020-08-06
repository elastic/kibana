/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlSummaryJob } from '../../../ml/common/types/anomaly_detection_jobs';
import { ML_GROUP_IDS } from '../constants';

export const isSecurityJob = (job: MlSummaryJob): boolean =>
  job.groups.some((group) => ML_GROUP_IDS.includes(group));
