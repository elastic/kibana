/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlJob } from '@elastic/elasticsearch/lib/api/types';
import { isPopulatedObject } from '../../../common';
import { MlSummaryJob } from '../../../common/types/anomaly_detection_jobs';

export const isManagedJob = (job: MlSummaryJob | MlJob) => {
  return (
    (isPopulatedObject(job, ['customSettings']) && job.customSettings.managed === true) ||
    (isPopulatedObject(job, ['custom_settings']) && job.custom_settings.managed === true)
  );
};
